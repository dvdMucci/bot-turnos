require('dotenv').config();
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MySQLAdapter = require('@bot-whatsapp/database/mysql')

const MYSQL_DB_HOST = process.env.MYSQL_DB_HOST;
const MYSQL_DB_USER = process.env.MYSQL_DB_USER;
const MYSQL_DB_PASSWORD = process.env.MYSQL_DB_PASSWORD;
const MYSQL_DB_NAME = process.env.MYSQL_DB_NAME;
const MYSQL_DB_PORT = process.env.MYSQL_DB_PORT;

const { delay } = require('@whiskeysockets/baileys');

// Constante para el tiempo de timeout (4 horas en milisegundos)
const TIMEOUT_DURATION = 4 * 60 * 60 * 1000; //

// Objeto para almacenar los temporizadores por usuario
const userTimers = {};
const usuariosRespuestas = {};

// Función para manejar el timeout
const handleTimeout = async (from, flowDynamic) => {
    try {
        await flowDynamic('La conversación ha sido terminada por inactividad. Envíe *Hola* para comenzar nuevamente.');
        // Limpiar datos del usuario
        delete usuariosRespuestas[from];
        delete userTimers[from];
    } catch (error) {
        console.error('Error al manejar timeout:', error);
    }
};

// Función para resetear el timer
const resetTimer = (from, flowDynamic) => {
    if (userTimers[from]) {
        clearTimeout(userTimers[from]);
    }
    userTimers[from] = setTimeout(() => handleTimeout(from, flowDynamic), TIMEOUT_DURATION);
};

const iniciarRespuestas = (from) => {
    if (!usuariosRespuestas[from]) {
        usuariosRespuestas[from] = {
            respuestasCapturadas: {
                estudio: "",
                obraSocial: ""
            }
        };
    }
};

const flowNueve = addKeyword(['9'])
    .addAnswer('Cual es su consulta?\n(Si quiere volver al menú principal envíe *Hola*)',
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        }
    );

const flowFin = addKeyword(['#'])
    .addAnswer('Si quiere volver al menú principal envíe *Hola*\nQue tenga buen día!!',
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        }
    );

const flowIoma = addKeyword(['OS_IOMA'])
    .addAnswer(
        [
            'Deberá enviarnos una foto de:\n- Planilla de IOMA de alta complejidad.\n- DNI\n- Carnet o constancia afiliatoria de IOMA.\nEl trámite es online y demora de 2 a 5 días hábiles.\nSi quiere cancelar envíe #️⃣'
        ],
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        },
        [flowFin]
    );

const flowCancel = addKeyword(['0'])
    .addAnswer(
        [
            'Complete los siguientes datos:\nNombre completo:\nDNI:\nA la brevedad le contestamos.'
        ],
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        }
        /*       },
               [flowFin]
        */   );
    
const flowTres = addKeyword(['3'])
    .addAnswer(
        [
            'Las placas radiográficas son *sin turno*. Es por orden de llegada de 8 a 19:45 hs de lunes a viernes.\nLos sábados de 8 a 11:45 hs.\nSi quiere cancelar envíe #️⃣'
        ],
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        }
 /*       },
        [flowFin]
 */   );

const flowOtros = addKeyword(['OS_OTROS', '4', '5', '6', '8'])
    .addAnswer('👇', 
        null, 
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
            const from = ctx.from;
            iniciarRespuestas(from);
            const respuestas = usuariosRespuestas[from];
            const Est = respuestas.respuestasCapturadas.estudio;
            
            if (Est === "TOMOGRAFIA") {
                try {
                    await flowDynamic(`Si quiere cancelar envíe #️⃣\n\nEstudio: *${respuestas.respuestasCapturadas.estudio}*\n*Complete los siguientes datos:*\nApellido:\nNombre:\nDNI:\nFecha de nacimiento:\nPeso:\nAltura:\nDomicilio:\nLocalidad:\nTeléfono alternativo:\nCorreo electrónico:\nObra Social:\nTiene Marcapasos?:\nTiene Prótesis Metálicas?:\nSufre Claustrofobia?:\n`);
                    await flowDynamic('IMPORTANTE: Por favor envíe foto legible de su pedido médico y de su autorización.\n*Luego de enviar las imágenes, aguarde un instante y le generaremos el turno.*');
                } catch (error) {
                    console.error('Error al enviar el resumen:', error);
                }
            } else {
                try {
                    await flowDynamic(`Si quiere cancelar envíe #️⃣\n\nEstudio: *${respuestas.respuestasCapturadas.estudio}*\n*Complete los siguientes datos:*\nApellido:\nNombre:\nDNI:\nFecha de nacimiento:\nPeso:\nAltura:\nDomicilio:\nLocalidad:\nTeléfono alternativo:\nCorreo electrónico:\nObra Social:\n`);
                    await flowDynamic('IMPORTANTE: Por favor envíe foto legible de su pedido médico y de su autorización.\n*Luego de enviar las imágenes, aguarde un instante y le generaremos el turno.*');
                } catch (error) {
                    console.error('Error al enviar el resumen:', error);
                }
            }
        }
    )
    

const flowUno = addKeyword(['1', '2', '7'])
    .addAnswer(
        [
            'Su Obra Social es:',
            '*A* - IOMA',
            '*B* - Otros',
            '*#* - Para cancelar',
            '*Responda con un solo caracter.*'
        ],
        { capture: true },
        async (ctx, { fallBack, flowDynamic, endFlow, gotoFlow }) => {
            const input = ctx.body.trim();

            // Verificación estricta de un solo carácter
            if (input.length !== 1) {
                await flowDynamic('⚠️ Por favor, envíe un solo caracter (A, B o #)');
                return fallBack();
            }

            const inputUpperCase = input.toUpperCase();
            
            if (!['A', 'B', '#'].includes(inputUpperCase)) {
                await flowDynamic('⚠️ Opción no válida. Por favor, elija A, B o #');
                return fallBack();
            }

            // Almacenar la selección del usuario
            if (inputUpperCase === 'A' || inputUpperCase === 'B') {
                const from = ctx.from;
                iniciarRespuestas(from);
                usuariosRespuestas[from].respuestasCapturadas.obraSocial = 
                    inputUpperCase === 'A' ? 'IOMA' : 'OTROS';
            }

            // Manejar la respuesta válida
            switch (inputUpperCase) {
                case 'A':
                    await flowDynamic('Has seleccionado *A - IOMA*.');
                    ctx.body = 'OS_IOMA';
                    return gotoFlow(flowIoma);
                case 'B':
                    await flowDynamic('Has seleccionado *B - Otros*.');
                    ctx.body = '6';
                    return gotoFlow(flowOtros);
                case '#':
                    ctx.body = '#';
                    return gotoFlow(flowFin);
            }
        },
        [flowOtros]
    );

const flowPrincipal = addKeyword(['hola', 'buenos dias', 'buenas tardes', 'buenas noches'])
    .addAnswer(
        [
            'Hola, se comunicó con el *Instituto de diagnóstico de Alta Complejidad Sanatorio Junín*.',
            'Soy un Robot 🤖 y voy a ayudarle a gestionar su turno.',
            'Por favor, responda *solamente* con números (sin espacios ni puntos) la siguiente pregunta, ya que no puedo comprender textos, fotos o audios.\n\n👤 Al finalizar se comunicará una operadora para brindarle su turno.'
        ],
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        }
    )
    .addAnswer(
        [
            '⚠️ Por favor, elija un número del 0 al 9'
        ],
        null,
        async (ctx, { flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
        }
    )
    .addAnswer(
        [
            '*Que estudio necesita realizarse?*',
            '*1* RESONANCIA',
            '*2* TOMOGRAFIA',
            '*3* RADIOGRAFIA',
            '*4* ECOGRAFIA Y/O MAMOGRAFIA',
            '*5* DENSITOMETRIA',
            '*6* ESTUDIOS SERIADOS',
            '*7* ECODOPPLER',
            '*8* ELECTROCARDIOGRAMA',
            '*Elija un número de estudio*',
            '*9* Para otras consultas.',
            '*0* Para cancelar un turno'
        ],
        { capture: true},
        async (ctx, { fallBack, flowDynamic }) => {
            resetTimer(ctx.from, flowDynamic);
            const opcionesEstudios = {
                '1': 'RESONANCIA',
                '2': 'TOMOGRAFIA',
                '3': 'RADIOGRAFIA',
                '4': 'ECOGRAFIA Y/O MAMOGRAFIA',
                '5': 'DENSITOMETRIA',
                '6': 'ESTUDIOS SERIADOS',
                '7': 'ECODOPPLER',
                '8': 'ELECTROCARDIOGRAMA',
            };
            if (!/^[1234567890]$/.test(ctx.body)) {
                await flowDynamic('⚠️ Por favor, elija un número del 1 al 9');
                return fallBack();
            }
            const from = ctx.from;
            iniciarRespuestas(from);
            usuariosRespuestas[from].respuestasCapturadas.estudio = opcionesEstudios[ctx.body] || 'Otro';
        },
        [flowUno, flowTres, flowOtros, flowNueve, flowCancel]
    );

const main = async () => {
    const adapterDB = new MySQLAdapter({
        host: MYSQL_DB_HOST,
        user: MYSQL_DB_USER,
        database: MYSQL_DB_NAME,
        password: MYSQL_DB_PASSWORD,
        port: MYSQL_DB_PORT,
    })
    const adapterFlow = createFlow([
        flowPrincipal,
        flowIoma,
        flowFin
    ])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
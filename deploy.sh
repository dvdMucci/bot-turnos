#!/bin/bash

# Variables
ENV_FILE=".env"
DOCKER_COMPOSE_FILE="docker-compose.yml"
INDEX_HTML="index.html"
TARGET_PATH="node_modules/@bot-whatsapp/portal/dist/"
DB_CONTAINER="bot-turnos-db"
SQL_COMMAND="ALTER TABLE history MODIFY COLUMN refSerialize VARCHAR(255) NULL;"

# Verificar si existe el archivo .env
if [ ! -f "$ENV_FILE" ]; then
    echo "El archivo .env no existe. Por favor, crea uno antes de continuar usando el ejemplo en sample.env."
    exit 1
fi

# Cargar las variables del archivo .env
export $(grep -v '^#' $ENV_FILE | xargs)

# Verificar si las variables necesarias están definidas
if [ -z "$MYSQL_DB_USER" ] || [ -z "$MYSQL_DB_PASSWORD" ] || [ -z "$MYSQL_DB_NAME" ]; then
    echo "Faltan variables necesarias en el archivo .env. Asegúrate de definir MYSQL_DB_USER, MYSQL_DB_PASSWORD y MYSQL_DB_NAME."
    exit 1
fi

# Verificar si existe el archivo index.html
if [ ! -f "$INDEX_HTML" ]; then
    echo "El archivo $INDEX_HTML no existe en el directorio actual. Por favor, créalo antes de continuar."
    exit 1
fi

# Construir y levantar los contenedores con Docker Compose
echo "Iniciando la aplicación y la base de datos..."
docker compose up --build -d

# Esperar unos segundos para asegurarse de que los contenedores estén listos
echo "Esperando a que los contenedores estén listos..."
sleep 30

# Copiar el archivo index.html al contenedor
echo "Copiando index.html al contenedor..."
docker cp "$INDEX_HTML" bot-turnos-app:/app/$TARGET_PATH/index.html

# Modificar el campo refSerialize en la base de datos
echo "Modificando la tabla 'history' en la base de datos..."
docker exec -i "$DB_CONTAINER" mysql -u "$MYSQL_DB_USER" -p"$MYSQL_DB_PASSWORD" -e "USE $MYSQL_DB_NAME; $SQL_COMMAND"

if [ $? -eq 0 ]; then
    echo "Modificación de la tabla 'history' completada con éxito."
else
    echo "Hubo un error al modificar la tabla 'history'. Verifica los logs."
    exit 1
fi

# Verificar el estado de los contenedores
echo "Verificando el estado de los contenedores..."
docker ps

echo "Despliegue completado. La aplicación está lista."

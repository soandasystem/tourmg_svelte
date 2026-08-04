# Etapa 1: Construcción (Build)
FROM node:22-alpine AS build

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código del proyecto
COPY . .

# Variables recibidas desde Render
ARG VITE_API_BASE_URL
ARG VITE_RENDER
ARG VITE_DGOCEAN
ARG VITE_FRURL
ARG VITE_S3URL

# Convertirlas en variables de entorno para Vite
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_RENDER=$VITE_RENDER
ENV VITE_DGOCEAN=$VITE_DGOCEAN
ENV VITE_FRURL=$VITE_FRURL
ENV VITE_S3URL=$VITE_S3URL

RUN printenv | grep VITE

# Construir la aplicación (esto generará la carpeta "dist")
RUN npm run build

# Etapa 2: Servidor web de producción (Nginx)
FROM nginx:alpine

# Copiar los archivos compilados de la etapa anterior a Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configurar Nginx para que funcione correctamente con Svelte Routing (Single Page Application)
# Esto hace que cualquier URL (ej: /payment) redirija siempre al index.html
#RUN echo "server {\n\
#    listen 80;\n\
#    location / {\n\
#        root /usr/share/nginx/html;\n\
#        index index.html index.htm;\n\
#        try_files \$uri \$uri/ /index.html;\n\
#    }\n\
#}" > /etc/nginx/conf.d/default.conf
#el run lo reemplace por esta linea
COPY default.conf /etc/nginx/conf.d/default.conf
# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

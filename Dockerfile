# Dockerfile para servir archivos estáticos del frontend con Nginx
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80

FROM nginx:latest

COPY nginx.conf /etc/nginx/nginx.conf
# COPY application_files/* /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

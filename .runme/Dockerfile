FROM node:14.0.0
WORKDIR /app
RUN npm install --global @gridsome/cli http-server
RUN gridsome create my-gridsome-site && \
    cd my-gridsome-site && \
    gridsome build
WORKDIR /app/my-gridsome-site
ENTRYPOINT http-server ./dist
FROM node:slim

LABEL "com.github.actions.name"="Create Releases"
LABEL "com.github.actions.description"="Creates releases with content from change logs."
LABEL "com.github.actions.icon"="star"

COPY . .

# RUN npm install

ENTRYPOINT ["node", "/index.js"]

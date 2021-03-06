FROM node:12-alpine
WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install
COPY . /app/
RUN npm run build

EXPOSE 8888
CMD ["npm", "start"]

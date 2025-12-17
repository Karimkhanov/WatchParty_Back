FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Создаем папки
RUN mkdir -p logs uploads

EXPOSE 5000

CMD ["npm", "run", "dev"]
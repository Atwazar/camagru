FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --only=production express pg bcryptjs dotenv cors body-parser jsonwebtoken node-cron nodemailer multer jimp

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

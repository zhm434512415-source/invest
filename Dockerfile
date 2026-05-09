FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE ${PORT:-4173}

CMD ["sh", "-c", "npx serve -s dist -l ${PORT:-4173}"]

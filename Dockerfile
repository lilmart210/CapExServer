FROM node:16

WORKDIR /src/user/app

COPY package*.json ./

RUN npm install

RUN mkdir build

COPY src ./src/

RUN npm run copy

RUN npm run build

EXPOSE 8722

CMD ["npm" , "run", "launch"]

FROM node:18

# Create app directory for the docker image
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app/

# Install app dependencies from package.json. If modules are not included in the package.json file enter a RUN command. E.g. RUN npm install <module-name>
# COPY package.json /usr/src/app/
COPY . /usr/src/app
RUN npm install
RUN npm install typescript@5.0.4 -g
RUN tsc

# Bundle app source
# RUN npm run build
EXPOSE 3000

# Enter the command which should be used when the image starts up. E.g. CMD ["node", "app.js"]
CMD ["node", "./dist/server.js"]

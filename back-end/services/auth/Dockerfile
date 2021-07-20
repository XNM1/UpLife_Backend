FROM node:12.15.0-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app

# Bundle app source
COPY . /usr/src/app

RUN apk add bash
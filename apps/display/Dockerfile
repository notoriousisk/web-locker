FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_DISPLAY_API_BASE_URL=/api
ARG VITE_DISPLAY_BASE_PATH=/display/
ENV VITE_DISPLAY_API_BASE_URL=$VITE_DISPLAY_API_BASE_URL
ENV VITE_DISPLAY_BASE_PATH=$VITE_DISPLAY_BASE_PATH

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/display

EXPOSE 80

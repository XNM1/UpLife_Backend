<div align="center"><img src="Logo.png" alt="UpLife Messenger Logo"/></div>
<h1 align="center">UpLife Messenger</h1>
<p align="center"><i>The highly available and scalable messenger for endless communication</i></p>

## About

UpLife Messenger is a powerful and versatile messaging application that provides a seamless communication experience for users. With UpLife Messenger, you can stay connected with your friends, family, and colleagues in real-time.

One of the unique features of UpLife Messenger is support for checklists in messages, which makes it easy to manage tasks and collaborate with others. You can also add tags to your messages, which helps to organize and search for messages easily.

UpLife Messenger uses real-time notification by WebSocket to ensure that you never miss an important message. The backend is highly scalable and available, so you can rely on it to deliver messages reliably and quickly.

The app is open source, so you can customize it to suit your needs or contribute to the community. You can also customize your profile with avatars and backgrounds, and the app has a powerful contact system to help you manage your connections.

With real-time communication, you can enjoy seamless conversations with your contacts, whether you're on the go or at your desk. 

## Features

- ⚡Real-time messaging
- 🔑User registration, authentication and authorization
- 👥Group chats
- 📃Message history
- 💅Animated avatars and backgrounds
- ✅Check lists in message
- 🏷️Message Tags

## Requirements

- Docker 18.06.0+
- Artillery 1.5.0+ (for load testing)

## Installing

To install UpLife Messenger Backend, clone the repository from GitHub:

```bash
git clone https://github.com/XNM1/UpLife_Backend
```

## Usage

To start the application with Docker, use the following command:

```bash
docker compose up back-end/docker-compose-dev.yml
```

## Test

To run load tests with Artillery, use the following command:

```bash
artillery run load-tests/get_data_test.yml
```

## Architecture

<div align="center"><img src="diagrams/images/Server_Arch_Diagram.jpg" alt="Architecture Diagram"/></div>
<p align="center"><i>Backend Architecture Diagram</i></p>
<br>

UpLife Messenger Backend is built using the following technologies:

- Node.js
- Express
- Socket.io
- Passport.js
- Dgraph
- Redis
- Nginx
- HAProxy
- Docker
<br>

The architecture of UpLife Messenger utilizes of the following patterns:

<div align="center"><img src="diagrams/images/CQRS_Diagram.jpg" alt="CQRS Diagram"/></div>
<p align="center"><i>CQRS Diagram</i></p>
<br><br>

<div align="center"><img src="diagrams/images/Event_Bus_Diagram.jpg" alt="Event Bus Diagram"/></div>
<p align="center"><i>Event Bus Diagram</i></p>
<br>

Data scheme diagrams:

<div align="center"><img src="diagrams/images/ER_Diagram.jpg" alt="Entity-Relationship Diagram"/></div>
<p align="center"><i>Entity-Relationship Diagram</i></p>
<br><br>

<div align="center"><img src="diagrams/images/Graph_Diagram.jpg" alt="Graph Representation Diagram"/></div>
<p align="center"><i>Graph Representation of Data</i></p>
<br>

Here's a sequence diagram that illustrates the interaction between the different components of the system:

<div align="center"><img src="diagrams/images/Sequence_Diagram.jpg" alt="Sequence Diagram"/></div>
<p align="center"><i>Sequence Diagram</i></p>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
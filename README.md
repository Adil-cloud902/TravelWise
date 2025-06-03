# 🌍 TravelWise – Recommandations de Voyage Intelligentes

**TravelWise** est une application web moderne qui aide les utilisateurs à planifier leurs voyages en leur proposant des recommandations personnalisées en fonction de leurs préférences : hôtels, vols, activités, climat, budget, durée, etc.

L’application est construite avec un **frontend en ReactJS** et un **backend en Spring Boot**, et utilise des **API REST**, une base de données **MySQL**, et divers services tiers (météo, géolocalisation…).

---

## 🧭 Fonctionnalités Principales

- 🔍 Recommandations personnalisées (Hôtels, Vols, Activités)
- 🌤️ Filtres par climat, budget, durée, etc.
- 💾 Enregistrement des destinations favorites
- 🧭 Interface fluide et interactive avec React
- 🛠️ API REST sécurisée en Spring Boot
- 🌐 Intégration d’API tierces (géolocalisation, météo...)

---

## 🛠️ Technologies Utilisées

### 🔧 Backend (Spring Boot)
- Java 17+
- Spring Boot
- Spring Data JPA
- REST API
- MySQL
- Maven

### 🎨 Frontend (ReactJS)
- ReactJS
- Axios
- React Router
- TailwindCSS

---

## ⚙️ Installation et Lancement

### 📌 Prérequis

Assurez-vous d’avoir installé sur votre machine :

- Node.js & npm
- Java JDK 17+
- Maven
- MySQL

---

### 🗄️ 1. Configuration de la Base de Données

- Créez une base de données nommée **auth_db** dans votre SGBD (MySQL).
- Importez le script **auth_db.sql** pour générer les tables et insérer les données nécessaires.

---

### 🎨 2. Lancement du Frontend (React)

```bash
# Accédez au dossier frontend
cd frontend

# Installez les dépendances
npm install

# Lancez l'application
npm run dev
```

L'application frontend sera accessible à l'adresse :  
👉 http://localhost:5173

---

### ⚙️ 3. Lancement du Backend (Spring Boot)

- Ouvrez le projet backend dans IntelliJ ou Spring Tool Suite (STS).
- Configurez le fichier `application.properties` avec les informations de votre base de données.
- Exécutez l'application via la méthode `main()` de la classe principale.

Par défaut, le backend sera disponible à l'adresse :  
👉 http://localhost:8080

---

## 🚀 À venir

- 🔐 Authentification et autorisation (JWT)
- 🌎 Support multilingue
- 📊 Tableau de bord de statistiques de voyage
- 📱 Version mobile

---

## 🧑‍💻 Auteur

- **Adil-cloud902** – [GitHub](https://github.com/Adil-cloud902)
- **Salma-Haidar** – [GitHub](https://github.com/Salma-Haidar)
- **sahar-sec** – [GitHub](https://github.com/sahar-sec)

---


✨ Bon voyage avec TravelWise ! ✨

# Fuqua Racquets Club Central Hub 🎾

A premium, high-performance web application designed for the Fuqua Racquets Club community. This platform serves as a central hub for booking courts, discovering social events, and staying updated with live racquet sports news.

![Fuqua Racquets Club Logo](public/new_logo.png)

## ✨ Features

- **🏆 Dynamic Booking Engine**: Seamlessly book Tennis, Badminton, and Squash sessions. Includes logic for recurring slots, attendee management, and court-specific rules.
- **📱 Progressive Web App (PWA)**: Installable on any mobile device or desktop for a native-app experience, complete with offline support and quick-launch icons.
- **⚙️ Account-Linked Preferences**: Users can customize their booking experience by reordering or hiding sports tabs, with settings synced across all devices via Firestore.
- **📰 Social Hub & News**: Live ticker with the latest sports results (e.g., Indian Wells, All England Open) and a curated feed of racquet sports news.
- **🔐 Secure Duke Authentication**: Exclusive access for the Duke community with `@duke.edu` email verification requirements.
- **👔 Admin Suite**: Dedicated dashboard for club admins to manage sessions and club events in real-time.

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Wimbledon-inspired custom theme)
- **Icons**: Lucide React
- **Backend/Database**: Firebase (Authentication & Firestore)
- **Deployment**: Optimized for high-speed delivery with Vite and PWA integration.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase project (for Auth and Firestore)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-username]/racquets-club-website.git
   cd racquets-club-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory (referencing `src/lib/firebase.ts` for needed keys):
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Launch Development Server**
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `src/components/home`: Core features like the Booking Engine and Social Hub.
- `src/components/layout`: Global navigation, Ticker, and Modals.
- `src/contexts`: Authentication and Firestore state management.
- `src/lib`: Firebase configuration and initialization.
- `public/`: Static assets including the PWA manifest and club logos.

## ⚖️ License

Built for the Fuqua Racquets Club. Internal use only.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCz0-dUukvFHUG6DZR9hGdgduUzTcobt0M",
  authDomain: "dental-tracker-b6242.firebaseapp.com",
  projectId: "dental-tracker-b6242",
  storageBucket: "dental-tracker-b6242.firebasestorage.app",
  messagingSenderId: "418391581928",
  appId: "1:418391581928:web:30fa024c3b71a9858ad55d",
  measurementId: "G-5BFYNLJ8QQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
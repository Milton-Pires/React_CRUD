import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getRemoteConfig } from "firebase/remote-config";

const firebaseConfig = {
  apiKey: "AIzaSyC84fB_sVz1Knsk1gF2HSaO3l0LtqUCrnU",
  authDomain: "myproject-526bc.firebaseapp.com",
  databaseURL: "https://myproject-526bc-default-rtdb.firebaseio.com/",
  projectId: "myproject-526bc",
  storageBucket: "myproject-526bc.firebasestorage.app",
  messagingSenderId: "35168514831",
  appId: "1:35168514831:web:7d2b95985b1171d22bc47a",
  measurementId: "G-55YQ7VNE2G"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 0; 

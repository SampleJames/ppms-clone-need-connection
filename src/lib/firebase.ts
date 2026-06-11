// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import { getFirestore, initializeFirestore } from "firebase/firestore";

// // const firebaseConfig = {
// //   apiKey: "AIzaSyDV7q56ia4amjpGXPWpmC3iawSSD52kAu8",
// //   authDomain: "costpro-69a4a.firebaseapp.com",
// //   projectId: "costpro-69a4a",
// //   storageBucket: "costpro-69a4a.firebasestorage.app",
// //   messagingSenderId: "366592229606",
// //   appId: "1:366592229606:web:9ddddcbaf0c6efd911fb27",
// // };

// const firebaseConfig = {
//   apiKey: "AIzaSyCMv4jOJ8gdsuBUEgyjH78cImHOIic8qn0",
//   authDomain: "sample-project-77fd0.firebaseapp.com",
//   projectId: "sample-project-77fd0",
//   storageBucket: "sample-project-77fd0.firebasestorage.app",
//   messagingSenderId: "968564331026",
//   appId: "1:968564331026:web:b5d3185347708ff7d53ecb",
//  // measurementId: "G-TRJQPHNF99"
// };



// export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
// export const auth = getAuth(app);
// export const googleProvider = new GoogleAuthProvider();

// let _db;
// try {
//   _db = initializeFirestore(app, { ignoreUndefinedProperties: true });
// } catch {
//   _db = getFirestore(app);
// }
// export const db = _db;


import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, OAuthProvider, GoogleAuthProvider } from "firebase/auth"; 
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_DYUs_0uC4lHqYoTYumBF6wmDNhCmOEg",
  authDomain: "ppms-71fd0.firebaseapp.com",
  projectId: "ppms-71fd0",
  storageBucket: "ppms-71fd0.firebasestorage.app",
  messagingSenderId: "906548325202",
  appId: "1:906548325202:web:9386f1e613ea15dd1ee88b",
  //measurementId: "G-F5LBJZH9QZ"
};
// Initialize Firebase App (prevents duplicate initialization errors in React)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Authentication Providers
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Lock Microsoft login to your specific TSU Tenant ID
microsoftProvider.setCustomParameters({
  tenant: 'bebf77b2-2746-4203-96d7-17f29e16cb16' 
});

// Initialize Firestore Database (with support for ignoring undefined properties)
let _db;
try {
  _db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  _db = getFirestore(app);
}

export const db = _db;
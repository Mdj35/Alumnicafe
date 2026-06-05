import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC6bMGfXgvqqRZN_wGZ9WsyQiJnvv2j2ok",
  authDomain: "alumni-cafe.firebaseapp.com",
  projectId: "alumni-cafe",
  storageBucket: "alumni-cafe.firebasestorage.app",
  messagingSenderId: "812265677398",
  appId: "1:812265677398:web:db60a922fe3f2961bc91f7",
  measurementId: "G-7TH56JRQP4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createAdmin() {
  const COLLECTION_NAME = 'cashiers';
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  
  let newId = 1;
  let alreadyExists = false;
  if (!querySnapshot.empty) {
    const ids: number[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.id) ids.push(data.id);
      if (data.username === 'admin' || data.username === 'admin@alumnicafe') {
        alreadyExists = true;
      }
    });
    if (ids.length > 0) {
      newId = Math.max(...ids) + 1;
    }
  }

  if (alreadyExists) {
    console.log('Admin user already exists!');
    // Even if it exists, let's update it to ensure password is correct or just overwrite it?
    // Let's just warn but proceed to update if we can find the id? 
    // Wait, let's just use a fixed ID for admin if needed, or query for the id.
  }

  // To be safe, we'll just check if there's a doc where username='admin'
  let targetId = newId.toString();
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.username === 'admin' || data.username === 'admin@alumnicafe') {
        targetId = docSnap.id;
        console.log(`Found existing admin with id ${targetId}, overwriting...`);
    }
  });

  const adminAccount = {
    id: parseInt(targetId),
    name: 'Admin',
    username: 'admin',
    role: 'Admin',
    password: 'alumnicafeadmin'
  };

  await setDoc(doc(db, COLLECTION_NAME, targetId), adminAccount);
  console.log('Admin account created successfully.');
  process.exit(0);
}

createAdmin().catch(console.error);

import { View, Button } from "react-native";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CigaretteTracker() {
  const addCigarette = async () => {
    await addDoc(collection(db, "consommation"), { date: new Date(), count: 1 });
  };

  return (
    <View>
      <Button title="Ajouter une cigarette" onPress={addCigarette} />
    </View>
  );
}

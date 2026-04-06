// useFeatureFlags.js
//
// Hook responsável por ler e escrever Feature Flags no Realtime Database.
// A leitura só começa após o usuário estar autenticado (user != null),
// evitando o erro PERMISSION_DENIED nas rules do Firebase.

import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "./firebaseConfig";

// Valores padrão usados enquanto o banco não respondeu ainda
const DEFAULT_FLAGS = {
  enable_image_upload: true,
  enable_edit_task: true,
  enable_dark_mode: true,
};

// ---------------------------------------------------------------------------
// useFeatureFlags — lê e escreve flags em tempo real
// Recebe o user como parâmetro para só iniciar após autenticação
// ---------------------------------------------------------------------------
export function useFeatureFlags(user) {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Só busca as flags se o usuário estiver logado
    if (!user) {
      setLoading(false);
      return;
    }

    const flagsRef = ref(db, "feature_flags");

    const unsubscribe = onValue(
      flagsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setFlags({ ...DEFAULT_FLAGS, ...data });
        }
        setLoading(false);
      },
      (error) => {
        console.error("[useFeatureFlags] Erro ao ler flags:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]); // re-executa quando o user muda (login/logout)

  /**
   * Atualiza uma flag no Realtime Database.
   * Só funciona para usuários listados em /admins/<uid>.
   */
  const setFlag = async (key, value) => {
    try {
      await update(ref(db, "feature_flags"), { [key]: value });
    } catch (error) {
      console.error("[useFeatureFlags] Erro ao atualizar flag:", error);
      throw error;
    }
  };

  return { flags, setFlag, loading };
}

// ---------------------------------------------------------------------------
// useIsAdmin — verifica se o usuário logado está em /admins/<uid>
// ---------------------------------------------------------------------------
export function useIsAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const adminRef = ref(db, `admins/${user.uid}`);
    const unsubscribe = onValue(adminRef, (snapshot) => {
      setIsAdmin(snapshot.val() === true);
    });

    return unsubscribe;
  }, [user]);

  return isAdmin;
}
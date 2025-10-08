import i18n from "i18next";
import { initReactI18next } from "react-i18next";
 
i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        "welcome": "Bienvenido",
        "login": "Iniciar sesión",
        "logout": "Cerrar sesión",
        "tituloTabla": "Tabla de Productividad",
        "linea": "Linea",
        "fecha":"Fecha",
        "turno": "Turno",
        "supervisor":"Supervisor",
        "teamleader": "Lider",
        "infoProd": "INFORMACIÓN DE PRODUCCIÓN",
        "hora": "Hora",
        "meta": "Meta",
        "real":"Real",
        "modelo":"Modelo",
        "perdidas": "Perdidas",
        "observaciones":"Observaciones"
      }
    },
    pt: {
      translation: {
        "welcome": "Bem-vindo",
        "login": "Iniciar sessão",
        "logout": "Sair da sessão",
        "tituloTabla": "Tabela de Produtividade",
        "linea": "Linha de Produção",
        "fecha":"Date",
        "turno": "Turno",
        "supervisor":"Supervisor",
        "teamleader": "Teamleader",
        "infoProd": "INFORMACIÓN DE PRODUCCIÓN",
        "hora": "Hour",
        "meta": "Meta",
        "real":"Real",
        "modelo":"Modelo",
        "perdidas": "Perdidas",
        "observaciones":"Observaciones"
      }
    },
    en: {
      translation: {
        "welcome": "Welcome",
        "login": "Log in",
        "logout": "Log out",
        "tituloTabla": "Productivity Table",
        "linea": "Production Line",
        "fecha":"Date",
        "turno": "Turno",
        "supervisor":"Supervisor",
        "teamleader": "Teamleader",
        "infoProd": "INFORMACIÓN DE PRODUCCIÓN",
        "hora": "Hour",
        "meta": "Meta",
        "real":"Real",
        "modelo":"Modelo",
        "perdidas": "Perdidas",
        "observaciones":"Observaciones"
      }
    }
  },
  lng: "es",
  fallbackLng: "es",
  interpolation: {
    escapeValue: false
  }
});
 
export default i18n;
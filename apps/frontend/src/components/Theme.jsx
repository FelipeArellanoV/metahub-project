import {createContext,useContext,useState} from 'react';
import {Sun,Moon} from 'lucide-react';
const ThemeContext=createContext(null);
function initialTheme(){try{const saved=localStorage.getItem('metahub_theme');if(saved==='dark'||saved==='light')return saved;}catch{}return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';}
const initial=initialTheme();document.documentElement.dataset.theme=initial;
export function ThemeProvider({children}){
 const [theme,setTheme]=useState(initial);
 function choose(value){document.documentElement.dataset.theme=value;setTheme(value);try{localStorage.setItem('metahub_theme',value);}catch{}}
 return <ThemeContext.Provider value={{theme,choose}}>{children}</ThemeContext.Provider>;
}
export function ThemeSwitch(){const {theme,choose}=useContext(ThemeContext);return <div className="theme-toolbar"><div className="theme-switch" role="group" aria-label="Apariencia de MetaHub"><button type="button" aria-pressed={theme==='light'} onClick={()=>choose('light')}><Sun size={15}/>Claro</button><button type="button" aria-pressed={theme==='dark'} onClick={()=>choose('dark')}><Moon size={15}/>Oscuro</button></div></div>;}

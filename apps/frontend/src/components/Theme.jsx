import {createContext,useContext,useState} from 'react';
import {Sun,Moon} from 'lucide-react';

/** Tema oscuro por defecto (estilo de app deportiva). El claro queda como opción en Ajustes. */
const ThemeContext=createContext(null);
const BAR_COLOR={dark:'#050607',light:'#F2F3F5'};

function initialTheme(){
  try{const saved=localStorage.getItem('metahub_theme');if(saved==='dark'||saved==='light')return saved;}catch{}
  return 'dark';
}
function apply(value){
  document.documentElement.dataset.theme=value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',BAR_COLOR[value]);
}

const initial=initialTheme();
apply(initial);

export function ThemeProvider({children}){
  const [theme,setTheme]=useState(initial);
  function choose(value){apply(value);setTheme(value);try{localStorage.setItem('metahub_theme',value);}catch{}}
  return <ThemeContext.Provider value={{theme,choose}}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitch(){
  const {theme,choose}=useContext(ThemeContext);
  return (
    <div className="theme-switch" role="group" aria-label="Apariencia de MetaHub">
      <button type="button" aria-pressed={theme==='dark'} onClick={()=>choose('dark')}><Moon size={15} aria-hidden="true"/>Oscuro</button>
      <button type="button" aria-pressed={theme==='light'} onClick={()=>choose('light')}><Sun size={15} aria-hidden="true"/>Claro</button>
    </div>
  );
}

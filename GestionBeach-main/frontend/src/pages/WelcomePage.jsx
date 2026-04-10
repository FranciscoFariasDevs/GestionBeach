import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Fade,
  Divider,
  IconButton,
  useTheme,
  alpha,
  Fab,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  WbSunny,
  Brightness3,
  WbTwilight,
  Refresh,
  AutoAwesome,
  ReportProblem as ReportProblemIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// ── Positivismo ───────────────────────────────────────────────────────────────
const frasesMotivacionales = [
  { texto: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", autor: "Robert Collier" },
  { texto: "La única forma de hacer un gran trabajo es amar lo que haces.", autor: "Steve Jobs" },
  { texto: "No cuentes los días, haz que los días cuenten.", autor: "Muhammad Ali" },
  { texto: "El futuro pertenece a quienes creen en la belleza de sus sueños.", autor: "Eleanor Roosevelt" },
  { texto: "La excelencia no es un acto, sino un hábito.", autor: "Aristóteles" },
  { texto: "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.", autor: "Albert Schweitzer" },
  { texto: "No esperes. Nunca será el momento perfecto.", autor: "Napoleon Hill" },
  { texto: "La mejor manera de predecir el futuro es crearlo.", autor: "Peter Drucker" },
  { texto: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.", autor: "Vidal Sassoon" },
  { texto: "Haz de cada día tu obra maestra.", autor: "John Wooden" },
  { texto: "El optimismo es la fe que conduce al logro.", autor: "Helen Keller" },
  { texto: "La persistencia es el camino del éxito.", autor: "Charles Chaplin" },
  { texto: "Cree en ti mismo y todo será posible.", autor: "Anónimo" },
  { texto: "La motivación es lo que te hace empezar. El hábito es lo que te hace continuar.", autor: "Jim Ryun" },
  { texto: "No dejes que lo que no puedes hacer interfiera con lo que puedes hacer.", autor: "John Wooden" },
  { texto: "La diferencia entre lo ordinario y lo extraordinario es ese pequeño extra.", autor: "Jimmy Johnson" },
  { texto: "El trabajo duro supera al talento cuando el talento no trabaja duro.", autor: "Tim Notke" },
  { texto: "Tu tiempo es limitado, no lo desperdicies viviendo la vida de otra persona.", autor: "Steve Jobs" },
  { texto: "La vida es 10% lo que te sucede y 90% cómo reaccionas ante ello.", autor: "Charles R. Swindoll" },
  { texto: "El cambio es la ley de la vida. Aquellos que solo miran al pasado o al presente, se perderán el futuro.", autor: "John F. Kennedy" },
  { texto: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje de continuar.", autor: "Winston Churchill" },
  { texto: "La disciplina es el puente entre las metas y los logros.", autor: "Jim Rohn" },
  { texto: "No te rindas. El comienzo siempre es el más difícil.", autor: "Proverbio Árabe" },
  { texto: "El fracaso es una gran oportunidad para empezar otra vez con más inteligencia.", autor: "Henry Ford" },
  { texto: "La calidad no es un acto, es un hábito.", autor: "Aristóteles" },
  { texto: "El verdadero fracaso es no intentarlo.", autor: "George Clooney" },
  { texto: "La confianza en sí mismo es el primer secreto del éxito.", autor: "Ralph Waldo Emerson" },
  { texto: "Los sueños son extremadamente importantes. Nada se hace sin que antes se imagine.", autor: "George Lucas" },
  { texto: "El talento gana juegos, pero el trabajo en equipo gana campeonatos.", autor: "Michael Jordan" },
  { texto: "La acción es la clave fundamental de todo éxito.", autor: "Pablo Picasso" },
  { texto: "No importa qué tan lento vayas, siempre y cuando no te detengas.", autor: "Confucio" },
  { texto: "Los líderes no crean seguidores, crean más líderes.", autor: "Tom Peters" },
  { texto: "La innovación distingue a un líder de un seguidor.", autor: "Steve Jobs" },
  { texto: "El secreto de salir adelante es comenzar.", autor: "Mark Twain" },
  { texto: "Siempre parece imposible hasta que se hace.", autor: "Nelson Mandela" },
  { texto: "La creatividad es la inteligencia divirtiéndose.", autor: "Albert Einstein" },
  { texto: "Los desafíos son lo que hacen la vida interesante. Superarlos es lo que la hace significativa.", autor: "Joshua J. Marine" },
  { texto: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.", autor: "Winston Churchill" },
  { texto: "La vida no se trata de encontrarte a ti mismo, sino de crearte a ti mismo.", autor: "George Bernard Shaw" },
  { texto: "No busques el momento perfecto. Toma el momento y hazlo perfecto.", autor: "Anónimo" },
  { texto: "El éxito consiste en obtener lo que se desea. La felicidad, en disfrutar lo que se obtiene.", autor: "Ralph Waldo Emerson" },
  { texto: "Cada logro comienza con la decisión de intentarlo.", autor: "Gail Devers" },
  { texto: "La actitud positiva causa una reacción en cadena de pensamientos, eventos y resultados positivos.", autor: "Wade Boggs" },
  { texto: "El modo de empezar es dejar de hablar y comenzar a hacer.", autor: "Walt Disney" },
  { texto: "La perfección no se alcanza cuando no hay nada más que añadir, sino cuando no hay nada más que quitar.", autor: "Antoine de Saint-Exupéry" },
  { texto: "No te preocupes por los fracasos, preocúpate por las oportunidades que pierdes al no intentarlo.", autor: "Jack Canfield" },
  { texto: "La grandeza no consiste en recibir honores, sino en merecerlos.", autor: "Aristóteles" },
  { texto: "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.", autor: "Proverbio Chino" },
  { texto: "El fracaso es solo la oportunidad de comenzar de nuevo de forma más inteligente.", autor: "Henry Ford" },
  { texto: "No hay secretos para el éxito. Este se alcanza preparándose, trabajando arduamente y aprendiendo del fracaso.", autor: "Colin Powell" },
  { texto: "La única forma de ganar es aprendiendo más rápido que los demás.", autor: "Eric Ries" },
  { texto: "Un ganador es un soñador que nunca se rinde.", autor: "Nelson Mandela" },
  { texto: "La diferencia entre quien eres y quien quieres ser es lo que haces.", autor: "Bill Phillips" },
  { texto: "La perseverancia es fallar 19 veces y tener éxito la vigésima.", autor: "Julie Andrews" },
  { texto: "Cree que puedes y ya estarás a mitad de camino.", autor: "Theodore Roosevelt" },
  { texto: "Las oportunidades no ocurren, las creas tú.", autor: "Chris Grosser" },
  { texto: "El progreso es imposible sin cambio, y aquellos que no pueden cambiar sus mentes no pueden cambiar nada.", autor: "George Bernard Shaw" },
  { texto: "La mejor venganza es el éxito masivo.", autor: "Frank Sinatra" },
  // 20 frases nuevas
  { texto: "Cada mañana que despiertas es una nueva oportunidad para cambiar tu vida.", autor: "Anónimo" },
  { texto: "Las grandes cosas nunca vienen de zonas de confort.", autor: "Neil Strauss" },
  { texto: "Si puedes soñarlo, puedes hacerlo.", autor: "Walt Disney" },
  { texto: "No midas tu riqueza por el dinero que tienes, sino por aquello por lo que no cambiarías tu dinero.", autor: "Paul Coelho" },
  { texto: "El coraje no es la ausencia del miedo, sino el juicio de que algo más es importante.", autor: "Ambrose Redmoon" },
  { texto: "Haz lo que puedas, con lo que tienes, donde estás.", autor: "Theodore Roosevelt" },
  { texto: "No hay ascensor hacia el éxito. Tendrás que usar las escaleras.", autor: "Zig Ziglar" },
  { texto: "Lo que no te mata, te hace más fuerte.", autor: "Friedrich Nietzsche" },
  { texto: "La energía y la persistencia conquistan todas las cosas.", autor: "Benjamin Franklin" },
  { texto: "Pequeñas mentes son las que someten a otros. Las grandes se someten a sí mismas.", autor: "Epicteto" },
  { texto: "La vida comienza donde termina tu zona de confort.", autor: "Neale Donald Walsch" },
  { texto: "Un río corta la roca no por su fuerza sino por su constancia.", autor: "Ovidio" },
  { texto: "Tu actitud, no tu aptitud, determinará tu altitud.", autor: "Zig Ziglar" },
  { texto: "No importa cuántas veces caes, sino cuántas veces te levantas.", autor: "Vince Lombardi" },
  { texto: "El secreto de adelantarse es empezar.", autor: "Sally Berger" },
  { texto: "La pasión es energía. Siente el poder que viene de enfocarte en lo que te emociona.", autor: "Oprah Winfrey" },
  { texto: "Para tener éxito, primero debes creer que puedes.", autor: "Nikos Kazantzakis" },
  { texto: "El mayor riesgo es no correr ningún riesgo.", autor: "Mark Zuckerberg" },
  { texto: "Trabaja en silencio; deja que tu éxito haga el ruido.", autor: "Anónimo" },
  { texto: "Sé el cambio que quieres ver en el mundo.", autor: "Mahatma Gandhi" },
];

// ── Bíblico ───────────────────────────────────────────────────────────────────
const frasesbiblicas = [
  { texto: "Todo lo puedo en Cristo que me fortalece.", autor: "Filipenses 4:13" },
  { texto: "Jehová es mi pastor; nada me faltará.", autor: "Salmos 23:1" },
  { texto: "El Señor es mi luz y mi salvación; ¿a quién temeré?", autor: "Salmos 27:1" },
  { texto: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.", autor: "Proverbios 3:5" },
  { texto: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.", autor: "Isaías 41:10" },
  { texto: "El amor es paciente, es bondadoso. El amor no tiene envidia.", autor: "1 Corintios 13:4" },
  { texto: "Pero los que esperan en Jehová tendrán nuevas fuerzas.", autor: "Isaías 40:31" },
  { texto: "Porque yo sé los pensamientos que tengo acerca de vosotros: pensamientos de paz.", autor: "Jeremías 29:11" },
  { texto: "La fe es la certeza de lo que se espera, la convicción de lo que no se ve.", autor: "Hebreos 11:1" },
  { texto: "Todo tiene su tiempo, y todo lo que se quiere debajo del cielo tiene su hora.", autor: "Eclesiastés 3:1" },
  { texto: "Encomienda a Jehová tu camino, y confía en él; y él hará.", autor: "Salmos 37:5" },
  { texto: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.", autor: "Salmos 46:1" },
  { texto: "No se haga mi voluntad, sino la tuya.", autor: "Lucas 22:42" },
  { texto: "Bienaventurados los de limpio corazón, porque ellos verán a Dios.", autor: "Mateo 5:8" },
  { texto: "El que comenzó en vosotros la buena obra, la perfeccionará.", autor: "Filipenses 1:6" },
  { texto: "Sed fuertes y valientes; no temáis ni os atemoricéis.", autor: "Deuteronomio 31:6" },
  { texto: "Con amor eterno te he amado; por tanto te prolongué mi misericordia.", autor: "Jeremías 31:3" },
  { texto: "Poned vuestra mira en las cosas de arriba, no en las de la tierra.", autor: "Colosenses 3:2" },
  { texto: "El nombre de Jehová es torre fuerte; a él correrá el justo y estará salvo.", autor: "Proverbios 18:10" },
  { texto: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.", autor: "Juan 3:16" },
  { texto: "Buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.", autor: "Mateo 6:33" },
  { texto: "Estad siempre gozosos. Orad sin cesar. Dad gracias en todo.", autor: "1 Tesalonicenses 5:16-18" },
  { texto: "El temor de Jehová es el principio de la sabiduría.", autor: "Salmos 111:10" },
  { texto: "Confía en Jehová, y haz el bien; y habitarás en la tierra, y te apacentarás de la verdad.", autor: "Salmos 37:3" },
  { texto: "Pedid, y se os dará; buscad, y hallaréis; llamad, y se os abrirá.", autor: "Mateo 7:7" },
];

// ── Oriente ───────────────────────────────────────────────────────────────────
const frasesOriente = [
  { texto: "El que sabe cuándo puede pelear y cuándo no puede, saldrá victorioso.", autor: "Sun Tzu" },
  { texto: "Si quieres conocer a una persona, no prestes atención a lo que dice, sino a lo que hace.", autor: "Confucio" },
  { texto: "La mente es como el agua: cuando está tranquila, todo se refleja con claridad.", autor: "Proverbio Zen" },
  { texto: "Superar a los demás requiere fuerza; superarse a uno mismo requiere poder interior.", autor: "Lao Tse" },
  { texto: "Aquel que pregunta es un tonto por cinco minutos. Aquel que no pregunta es un tonto para siempre.", autor: "Proverbio Chino" },
  { texto: "La flor que florece en la adversidad es la más rara y bella de todas.", autor: "Proverbio Chino" },
  { texto: "No tengas miedo de crecer lentamente; teme únicamente quedarte inmóvil.", autor: "Proverbio Chino" },
  { texto: "El bambú que se dobla es más fuerte que el roble que resiste.", autor: "Proverbio Japonés" },
  { texto: "Caí siete veces. Me levanté ocho.", autor: "Proverbio Japonés" },
  { texto: "Un viaje de mil millas comienza con un solo paso.", autor: "Lao Tse" },
  { texto: "El mayor error de todos es no hacer nada por pensar que solo puedes hacer poco.", autor: "Edmond Burke" },
  { texto: "Cuando sopla el viento de cambio, unos construyen muros y otros molinos.", autor: "Proverbio Chino" },
  { texto: "Conocerse a uno mismo es el comienzo de toda sabiduría.", autor: "Confucio" },
  { texto: "Actúa sin esfuerzo. Trabaja sin luchar. Saborea lo insípido.", autor: "Lao Tse" },
  { texto: "El sabio no acumula. Cuanto más vive para los demás, más tiene para él.", autor: "Lao Tse" },
  { texto: "En el agua quieta, la luna se refleja. En la mente quieta, la verdad se revela.", autor: "Proverbio Zen" },
  { texto: "Si te concentras solo en el pasado, perderás el futuro. Si miras solo al futuro, perderás el presente.", autor: "Proverbio Budista" },
  { texto: "El silencio es la fuente de la gran fuerza.", autor: "Lao Tse" },
  { texto: "Los obstáculos no pueden aplastarte; el obstáculo puede ser quitado por otro hombre.", autor: "Da Vinci" },
  { texto: "Una piedra preciosa no puede ser pulida sin fricción, ni un hombre perfeccionado sin pruebas.", autor: "Confucio" },
  { texto: "El que aprende pero no piensa, pierde su tiempo. El que piensa pero no aprende, está en peligro.", autor: "Confucio" },
  { texto: "Donde hay amor no puede haber oscuridad.", autor: "Proverbio Tibetano" },
  { texto: "La paciencia es amarga, pero su fruto es dulce.", autor: "Proverbio Chino" },
  { texto: "Para el samurái no hay trabajo mejor o peor. Hay deber.", autor: "Código Bushido" },
  { texto: "El árbol que no dobla sus ramas en la tormenta, acaba por romperlas.", autor: "Proverbio Japonés" },
];

const MODOS = {
  positivo: {
    label: '✨ Positivismo',
    titulo: 'Frase del día',
    frases: frasesMotivacionales,
    color: 'primary',
    borderColor: null, // usa primary.main
  },
  biblico: {
    label: '📖 Bíblico',
    titulo: 'Pasaje bíblico',
    frases: frasesbiblicas,
    color: 'success',
    borderColor: '#388e3c',
  },
  oriente: {
    label: '🏮 Oriente',
    titulo: 'Proverbio oriental',
    frases: frasesOriente,
    color: 'warning',
    borderColor: '#e65100',
  },
};

const WelcomePage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [icon, setIcon] = useState(<WbSunny />);
  const [quote, setQuote] = useState(null);
  const [showQuote, setShowQuote] = useState(false);
  const [modo, setModo] = useState('positivo');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Buenos días');
        setIcon(<WbSunny sx={{ fontSize: 60 }} />);
      } else if (hour >= 12 && hour < 19) {
        setGreeting('Buenas tardes');
        setIcon(<WbTwilight sx={{ fontSize: 60 }} />);
      } else {
        setGreeting('Buenas noches');
        setIcon(<Brightness3 sx={{ fontSize: 60 }} />);
      }
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRandomQuote = (m = modo) => {
    const pool = MODOS[m].frases;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  useEffect(() => {
    setQuote(getRandomQuote('positivo'));
    setTimeout(() => setShowQuote(true), 500);
  }, []);

  const handleRefreshQuote = () => {
    setShowQuote(false);
    setTimeout(() => {
      setQuote(getRandomQuote(modo));
      setShowQuote(true);
    }, 300);
  };

  const handleCambiarModo = (nuevoModo) => {
    if (nuevoModo === modo) return;
    setShowQuote(false);
    setTimeout(() => {
      setModo(nuevoModo);
      setQuote(getRandomQuote(nuevoModo));
      setShowQuote(true);
    }, 250);
  };

  const modoActual = MODOS[modo];
  const borderColor = modoActual.borderColor || theme.palette.primary.main;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: 8,
        pb: 4,
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Stack spacing={4} alignItems="center">
            {/* Header con saludo */}
            <Card elevation={8} sx={{ width: '100%', maxWidth: 800, borderRadius: 4, overflow: 'visible' }}>
              <CardContent sx={{ p: 5 }}>
                <Stack spacing={3} alignItems="center">
                  <Box
                    sx={{
                      color: theme.palette.primary.main,
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.05)', opacity: 0.8 },
                      },
                    }}
                  >
                    {icon}
                  </Box>

                  <Stack spacing={1} alignItems="center">
                    <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main, textAlign: 'center' }}>
                      {greeting}, {user?.username || 'Usuario'}!
                    </Typography>
                    <Typography variant="h5" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 300 }}>
                      Bienvenido al Sistema de Gestión Beach
                    </Typography>
                  </Stack>

                  <Divider sx={{ width: '100%', my: 2 }} />

                  <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesome sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        Tu día, tu éxito
                      </Typography>
                      <AutoAwesome sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                    </Stack>
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', fontSize: '1.1rem', px: 3 }}>
                      Elige uno de los módulos del menú para comenzar
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Frase del día */}
            <Fade in={showQuote} timeout={600}>
              <Card
                elevation={8}
                sx={{
                  width: '100%',
                  maxWidth: 800,
                  borderRadius: 4,
                  borderLeft: `6px solid ${borderColor}`,
                  transition: 'border-color 0.4s ease',
                  position: 'relative',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    {/* Header fila: título + micro botones + refresh */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Typography
                        variant="overline"
                        sx={{ color: borderColor, fontWeight: 700, letterSpacing: 1.5, transition: 'color 0.3s' }}
                      >
                        {modoActual.titulo}
                      </Typography>

                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {Object.entries(MODOS).map(([key, val]) => (
                          <Chip
                            key={key}
                            label={val.label}
                            size="small"
                            onClick={() => handleCambiarModo(key)}
                            color={modo === key ? val.color : 'default'}
                            variant={modo === key ? 'filled' : 'outlined'}
                            sx={{
                              fontSize: 11,
                              height: 22,
                              cursor: 'pointer',
                              fontWeight: modo === key ? 700 : 400,
                              transition: 'all 0.2s',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        ))}
                        <IconButton
                          onClick={handleRefreshQuote}
                          size="small"
                          sx={{
                            color: borderColor,
                            ml: 0.5,
                            '&:hover': {
                              background: alpha(borderColor, 0.1),
                              transform: 'rotate(180deg)',
                              transition: 'transform 0.3s ease',
                            },
                          }}
                        >
                          <Refresh fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="h5"
                      sx={{ fontStyle: 'italic', fontWeight: 400, color: theme.palette.text.primary, lineHeight: 1.6 }}
                    >
                      "{quote?.texto}"
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ color: borderColor, textAlign: 'right', fontWeight: 600, fontSize: '1rem', transition: 'color 0.3s' }}
                    >
                      — {quote?.autor}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Stack>
        </Fade>
      </Container>

      <Tooltip title="Reportar Problema" placement="left">
        <Fab
          color="error"
          aria-label="reportar problema"
          onClick={() => navigate('/reportar-problema')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px 0 rgba(102, 126, 234, 0.4)',
          }}
        >
          <ReportProblemIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default WelcomePage;

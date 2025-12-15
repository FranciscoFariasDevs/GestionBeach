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
  Tooltip
} from '@mui/material';
import {
  WbSunny,
  Brightness3,
  WbTwilight,
  Refresh,
  AutoAwesome,
  ReportProblem as ReportProblemIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Frases motivacionales en español
const frasesMotivacionales = [
  {
    texto: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    autor: "Robert Collier"
  },
  {
    texto: "La única forma de hacer un gran trabajo es amar lo que haces.",
    autor: "Steve Jobs"
  },
  {
    texto: "No cuentes los días, haz que los días cuenten.",
    autor: "Muhammad Ali"
  },
  {
    texto: "El futuro pertenece a quienes creen en la belleza de sus sueños.",
    autor: "Eleanor Roosevelt"
  },
  {
    texto: "La excelencia no es un acto, sino un hábito.",
    autor: "Aristóteles"
  },
  {
    texto: "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.",
    autor: "Albert Schweitzer"
  },
  {
    texto: "No esperes. Nunca será el momento perfecto.",
    autor: "Napoleon Hill"
  },
  {
    texto: "La mejor manera de predecir el futuro es crearlo.",
    autor: "Peter Drucker"
  },
  {
    texto: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.",
    autor: "Vidal Sassoon"
  },
  {
    texto: "Haz de cada día tu obra maestra.",
    autor: "John Wooden"
  },
  {
    texto: "El optimismo es la fe que conduce al logro.",
    autor: "Helen Keller"
  },
  {
    texto: "La persistencia es el camino del éxito.",
    autor: "Charles Chaplin"
  },
  {
    texto: "Cree en ti mismo y todo será posible.",
    autor: "Anónimo"
  },
  {
    texto: "La motivación es lo que te hace empezar. El hábito es lo que te hace continuar.",
    autor: "Jim Ryun"
  },
  {
    texto: "No dejes que lo que no puedes hacer interfiera con lo que puedes hacer.",
    autor: "John Wooden"
  },
  {
    texto: "La diferencia entre lo ordinario y lo extraordinario es ese pequeño extra.",
    autor: "Jimmy Johnson"
  },
  {
    texto: "El trabajo duro supera al talento cuando el talento no trabaja duro.",
    autor: "Tim Notke"
  },
  {
    texto: "Tu tiempo es limitado, no lo desperdicies viviendo la vida de otra persona.",
    autor: "Steve Jobs"
  },
  {
    texto: "La vida es 10% lo que te sucede y 90% cómo reaccionas ante ello.",
    autor: "Charles R. Swindoll"
  },
  {
    texto: "El cambio es la ley de la vida. Aquellos que solo miran al pasado o al presente, se perderán el futuro.",
    autor: "John F. Kennedy"
  },
  {
    texto: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje de continuar.",
    autor: "Winston Churchill"
  },
  {
    texto: "La disciplina es el puente entre las metas y los logros.",
    autor: "Jim Rohn"
  },
  {
    texto: "No te rindas. El comienzo siempre es el más difícil.",
    autor: "Proverbio Árabe"
  },
  {
    texto: "El fracaso es una gran oportunidad para empezar otra vez con más inteligencia.",
    autor: "Henry Ford"
  },
  {
    texto: "La calidad no es un acto, es un hábito.",
    autor: "Aristóteles"
  },
  {
    texto: "El verdadero fracaso es no intentarlo.",
    autor: "George Clooney"
  },
  {
    texto: "La confianza en sí mismo es el primer secreto del éxito.",
    autor: "Ralph Waldo Emerson"
  },
  {
    texto: "Los sueños son extremadamente importantes. Nada se hace sin que antes se imagine.",
    autor: "George Lucas"
  },
  {
    texto: "El talento gana juegos, pero el trabajo en equipo gana campeonatos.",
    autor: "Michael Jordan"
  },
  {
    texto: "La acción es la clave fundamental de todo éxito.",
    autor: "Pablo Picasso"
  },
  {
    texto: "No importa qué tan lento vayas, siempre y cuando no te detengas.",
    autor: "Confucio"
  },
  {
    texto: "Los líderes no crean seguidores, crean más líderes.",
    autor: "Tom Peters"
  },
  {
    texto: "La innovación distingue a un líder de un seguidor.",
    autor: "Steve Jobs"
  },
  {
    texto: "El secreto de salir adelante es comenzar.",
    autor: "Mark Twain"
  },
  {
    texto: "Siempre parece imposible hasta que se hace.",
    autor: "Nelson Mandela"
  },
  {
    texto: "La creatividad es la inteligencia divirtiéndose.",
    autor: "Albert Einstein"
  },
  {
    texto: "Los desafíos son lo que hacen la vida interesante. Superarlos es lo que la hace significativa.",
    autor: "Joshua J. Marine"
  },
  {
    texto: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.",
    autor: "Winston Churchill"
  },
  {
    texto: "La vida no se trata de encontrarte a ti mismo, sino de crearte a ti mismo.",
    autor: "George Bernard Shaw"
  },
  {
    texto: "La única manera de hacer un gran trabajo es amar lo que haces.",
    autor: "Steve Jobs"
  },
  {
    texto: "No busques el momento perfecto. Toma el momento y hazlo perfecto.",
    autor: "Anónimo"
  },
  {
    texto: "El éxito consiste en obtener lo que se desea. La felicidad, en disfrutar lo que se obtiene.",
    autor: "Ralph Waldo Emerson"
  },
  {
    texto: "Cada logro comienza con la decisión de intentarlo.",
    autor: "Gail Devers"
  },
  {
    texto: "La actitud positiva causa una reacción en cadena de pensamientos, eventos y resultados positivos.",
    autor: "Wade Boggs"
  },
  {
    texto: "El modo de empezar es dejar de hablar y comenzar a hacer.",
    autor: "Walt Disney"
  },
  {
    texto: "La perfección no se alcanza cuando no hay nada más que añadir, sino cuando no hay nada más que quitar.",
    autor: "Antoine de Saint-Exupéry"
  },
  {
    texto: "No te preocupes por los fracasos, preocúpate por las oportunidades que pierdes al no intentarlo.",
    autor: "Jack Canfield"
  },
  {
    texto: "La grandeza no consiste en recibir honores, sino en merecerlos.",
    autor: "Aristóteles"
  },
  {
    texto: "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.",
    autor: "Proverbio Chino"
  },
  {
    texto: "El fracaso es solo la oportunidad de comenzar de nuevo de forma más inteligente.",
    autor: "Henry Ford"
  },
  {
    texto: "No hay secretos para el éxito. Este se alcanza preparándose, trabajando arduamente y aprendiendo del fracaso.",
    autor: "Colin Powell"
  },
  {
    texto: "La única forma de ganar es aprendiendo más rápido que los demás.",
    autor: "Eric Ries"
  },
  {
    texto: "Un ganador es un soñador que nunca se rinde.",
    autor: "Nelson Mandela"
  },
  {
    texto: "La diferencia entre quien eres y quien quieres ser es lo que haces.",
    autor: "Bill Phillips"
  },
  {
    texto: "La perseverancia es fallar 19 veces y tener éxito la vigésima.",
    autor: "Julie Andrews"
  },
  {
    texto: "El éxito es la habilidad de ir de fracaso en fracaso sin perder tu entusiasmo.",
    autor: "Winston Churchill"
  },
  {
    texto: "Cree que puedes y ya estarás a mitad de camino.",
    autor: "Theodore Roosevelt"
  },
  {
    texto: "Las oportunidades no ocurren, las creas tú.",
    autor: "Chris Grosser"
  },
  {
    texto: "El progreso es imposible sin cambio, y aquellos que no pueden cambiar sus mentes no pueden cambiar nada.",
    autor: "George Bernard Shaw"
  },
  {
    texto: "La mejor venganza es el éxito masivo.",
    autor: "Frank Sinatra"
  }
];

const WelcomePage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [icon, setIcon] = useState(<WbSunny />);
  const [quote, setQuote] = useState(null);
  const [showQuote, setShowQuote] = useState(false);

  // Obtener saludo según la hora
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
    // Actualizar cada minuto por si cambia la hora
    const interval = setInterval(updateGreeting, 60000);

    return () => clearInterval(interval);
  }, []);

  // Obtener frase aleatoria
  useEffect(() => {
    getRandomQuote();
    setTimeout(() => setShowQuote(true), 500);
  }, []);

  const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * frasesMotivacionales.length);
    setQuote(frasesMotivacionales[randomIndex]);
  };

  const handleRefreshQuote = () => {
    setShowQuote(false);
    setTimeout(() => {
      getRandomQuote();
      setShowQuote(true);
    }, 300);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: 8,
        pb: 4
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Stack spacing={4} alignItems="center">
            {/* Header con saludo */}
            <Card
              elevation={8}
              sx={{
                width: '100%',
                maxWidth: 800,
                borderRadius: 4,
                overflow: 'visible'
              }}
            >
              <CardContent sx={{ p: 5 }}>
                <Stack spacing={3} alignItems="center">
                  {/* Icono del momento del día */}
                  <Box
                    sx={{
                      color: theme.palette.primary.main,
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.05)', opacity: 0.8 }
                      }
                    }}
                  >
                    {icon}
                  </Box>

                  {/* Saludo */}
                  <Stack spacing={1} alignItems="center">
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                        textAlign: 'center'
                      }}
                    >
                      {greeting}, {user?.username || 'Usuario'}!
                    </Typography>

                    <Typography
                      variant="h5"
                      color="text.secondary"
                      sx={{ textAlign: 'center', fontWeight: 300 }}
                    >
                      Bienvenido al Sistema de Gestión Beach
                    </Typography>
                  </Stack>

                  <Divider sx={{ width: '100%', my: 2 }} />

                  {/* Mensaje motivacional */}
                  <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesome sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        Tu día, tu éxito
                      </Typography>
                      <AutoAwesome sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
                    </Stack>

                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        textAlign: 'center',
                        fontSize: '1.1rem',
                        px: 3
                      }}
                    >
                      Elige uno de los módulos del menú para comenzar
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Frase motivacional */}
            <Fade in={showQuote} timeout={600}>
              <Card
                elevation={8}
                sx={{
                  width: '100%',
                  maxWidth: 800,
                  borderRadius: 4,
                  borderLeft: `6px solid ${theme.palette.primary.main}`,
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="overline"
                        sx={{
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          letterSpacing: 1.5
                        }}
                      >
                        Frase del día
                      </Typography>
                      <IconButton
                        onClick={handleRefreshQuote}
                        size="small"
                        sx={{
                          color: theme.palette.primary.main,
                          '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.1),
                            transform: 'rotate(180deg)',
                            transition: 'transform 0.3s ease'
                          }
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Stack>

                    <Typography
                      variant="h5"
                      sx={{
                        fontStyle: 'italic',
                        fontWeight: 400,
                        color: theme.palette.text.primary,
                        lineHeight: 1.6
                      }}
                    >
                      "{quote?.texto}"
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}
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

      {/* Botón flotante de Reportar Problema */}
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

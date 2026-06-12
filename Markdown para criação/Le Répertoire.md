
# Le Répertoire - O seu repertório *infinito* de ideias e adaptações
## App gerador de receitas com checklist de ingredientes disponíveis e modo receita estilo stories

Quero criar um app que eu possa abrir no celular, não precisa ser offline, mas precisa ter acesso à IA.

O app precisa das seguintes funcões:
# Página inicial
- Gere receitas a partir de um input simples ("massa com guisado").
- Ingrediente âncora ("600g de guisado"). Preenchimento opcional. Serve como base do que o usuário tem em casa, ingrediente base para porcionar a receita.
- Estilo da receita (janta elaborada, almoço rápido, lanche saboroso, etc). Preenchimento opcional.
- Botão "Gerar receita". Utiliza IA para criar um checklist de ingredientes (que será feito na próxima página) antes de gerar a receita completa.

# Página 2 - "O que você tem em casa?"
- Checklist de ingredientes com botões "Tenho" e "Não tenho". 
- Botão "Não tenho" abre uma caixa de input pré-preenchida com uma sugestão de substituição do ingrediente e breve explicação do que a alteração geraria de mudança prática na receita + botão de gerar nova sugestão (Ex: Ghee geraria uma sugestão de substituição por óleo de soja + manteiga integral, ou algo similar). Também gera um botão "Não tenho mesmo", onde o ingrediente é riscado da receita.
- Botão "Reavaliar Receita", para gerar a receita completa, com base nas alterações feitas no checklist.

# Página 3 - "Sugestão do Chef"
- Resumo da receita com explicação dos sabores.
- Botão "Ativar modo **sous-chef**". Leva pra próxima página.
- Mise en place.
- Descrição de cada passo da receita.
- Breve sugestão de acompanhamentos para receita (guarnições, saladas, o que fizer mais sentido).

# Página 4 - Modo *sous-chef*
- Estilo stories
- Cada passo da receita num "story" com botão de "próximo" e "voltar".
- Quando houver tempo para fazer algum passo (Ex: "cozinhe por 5 minutos"). Botão para iniciar cronômetro. Cada passo da receita deve ter um cronômetros independente que deve rodar em segundo plano, mesmo que o usuário alterne entre os passos da receita.
- Pequeno botão de Ajuda, que abre uma caixa para descrever algum problema no passo (IA precisa ajudar de forma MUITO rápida a resolver o problema, nesse caso).

# Diretrizes Gerais

**1. Embasamento científico obrigatório**
Toda técnica deve ser explicada em termos de físico-química: transferência de 
calor, reações de superfície, coagulação de proteínas, gelatinização de amidos, 
emulsificação, etc. Nunca use termos vagos como "dourar até ficar bonito". 
Prefira: "manter superfície entre 140–165°C para cinética ótima da Maillard 
sem degradação de aminoácidos". Leve em consideração os dados dos arquivos `temperaturas_proteinas.md` e `pontos_de_fumaca.md`

**2. Hardware real do Usuário**
- Panela de aço inox com fundo triplo (alta inércia térmica, recuperação lenta)
- Termômetro de agulha
- Fogão a gás (gradiente térmico diferente do indução)

**3. Esposa lactante**
Quando relevante, sinalizar ingredientes a evitar ou preferir (cafeína em 
excesso, álcool residual, ervas com potencial galactogogo ou inibidor).

**4. Formato de receitas**
Sempre estruturar em:
- Unidade de medidas g e ml
- Não utilize g/ml apenas em casos como de alimentos que se utilizam inteiros, como cebolas, tomates, dentes de alho, etc
- Nunca "a gosto" sem referência
- Pré-aquecimento e pontos de temperatura críticos
- Sequência técnica com justificativa para cada etapa
- Pontos de controle (o que observar visualmente/termicamente)
- Variáveis de ajuste (o que mudar se X não estiver funcionando)
- Sempre sinalizar em qual panela/frigideira o processo deve ser feito e em qual fogo (baixo, médio-baixo, médio, médio alto e alto)

**5. Tom**
Direto, técnico, pouco romantismo culinário. Pode usar analogias com soldagem, 
metalurgia ou mecânica quando facilitar o entendimento — o Lucas entende de 
transferência de calor em metais melhor do que a maioria dos cozinheiros. Leve em consideração a nomenclatura de alguns alimentos específicos da região do usuário, listados no arquivo `glossario_gaucho.md`

## Ingrediente Âncora

Quando o usuário informar que já possui um ingrediente em casa com quantidade definida
(ex: "tenho 800g de guisado"), esse ingrediente é o ÂNCORA da receita.
Regras:
- Todos os outros ingredientes são calculados proporcionalmente a partir do âncora
- Nunca sugerir quantidade diferente do âncora sem justificativa técnica
- Sempre indicar o número de porções que a receita vai render com base no âncora

## Equipamentos Disponíveis

Panelas Tramontina Allegra — Inox fundo triplo (alta inércia térmica):
- P1: 1,5L (1,0L útil) — caldos pequenos, molhos, reduções
- P2: 2,2L (1,5L útil) — molhos médios, ovos, acompanhamentos
- P3: 3,1L (2,1L útil) — uso geral, massas curtas, guisados pequenos
- P4: 5,5L (3,7L útil) — massas longas, receitas família, cozimentos longos
- Cozi-vapore 20cm (2,2L) — cocção a vapor

Frigideira Tramontina Solar — Inox fundo triplo:
- F1: 2,1L (1,4L útil) — selagem de proteínas, ovos, salteados

Panela de pressão Tramontina Vancouver
- PP: 4,5L

Regras de uso:
- Sempre nomear o equipamento no início de cada etapa (ex: "Na F1:", "Na P4:")
- Quando houver troca de panela ou remoção de ingrediente, isso é uma  etapa explícita, nunca subentendida
- Para deglaçar: avise se a proteína sai da panela antes. Isso deve constar como etapa separada e nomeada
- Nunca sugerir técnica incompatível com o volume útil disponível
  (ex: não sugerir selar 800g de carne na F1 de uma vez — cabe ~400g por leva sem quebrar a temperatura de Maillard)

## Modo *sous-chef — Estilo Stories (Mobile)

É para ser usado no celular em formato de stories.

Regras obrigatórias de formato:
- Cada passo deve caber em uma tela, sem necessida de rolar a tela
- Linguagem direta: verbo no imperativo, sem explicações longas inline
  (a explicação técnica fica na receita escrita, não no modo sous-chef)
- Toda troca de panela, remoção de ingrediente ou alterção no fogo precisa estar explícita,
  com nome do equipamento explícito
- Cronômetro: sempre que houver tempo definido, incluir o timer

## Estilo e Layout
O estilo do Le Répertoire será um "Light Mode" sofisticado e minimalista, inspirado nos menus de restaurantes de alta gastronomia e nas páginas de clássicas enciclopédias culinárias francesas. O layout deve priorizar o "respiro" visual (muito espaço em branco), transmitindo limpeza, organização e foco absoluto na precisão técnica e no ingrediente.

# A Paleta de Cores Clássica
- Fundo Principal: Off-white (um branco levemente quebrado, cor de creme ou papel pergaminho muito sutil), trazendo o conforto visual de um livro clássico.
- Textos e Leitura: Cinza chumbo profundo em vez de preto puro. Mantém o alto contraste e a elegância, mas com uma leitura mais suave.
- Acentos e Detalhes: Tons de cobre ou dourado envelhecido para botões de ação e ícones, uma referência direta às icônicas panelas de cobre usadas nas cozinhas tradicionais francesas.

# A Hierarquia Tipográfica
- Mrs Saint Delafield (Cursiva): Exclusiva para a marca, assinaturas visuais e para o nome das receitas. Traz o charme, a tradição e o toque humano.
- Fraunces (Serifada): Utilizada nos grandes cabeçalhos. Entrega a autoridade, o peso histórico e a sofisticação da alta gastronomia.
- Fonte sem Serifa: Aceito sugestão de uma fonte mais limpa e moderna, como as San Francisco e Roboto. O motor técnico do app. Usada em todo o texto corrido, passo a passo, controle de temperaturas e listas de ingredientes, garantindo um visual limpo, moderno e cientificamente legível.


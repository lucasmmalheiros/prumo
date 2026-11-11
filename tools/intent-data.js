'use strict';
// Frases de treino
const SLOTS = {
  A: ['30', '49,90', '120', '1500', '1.200', 'r$ 50', '50 reais', 'trinta reais', 'cem', 'cem reais', 'duzentos reais', 'mil reais', 'dois mil', 'quinhentos', 'cinquenta conto', '20 pila', '15', '80', '300', '2000', 'vinte', 'quarenta reais', '12,50', '9,99'],
  I: ['mercado', 'pizza', 'uber', 'gasolina', 'padaria', 'farmacia', 'lanche', 'almoco', 'ifood', 'cinema', 'remedio', 'roupa', 'tenis', 'presente', 'cerveja', 'acai', 'estacionamento', 'oficina', 'pet shop', 'feira', 'barbeiro', 'salao', 'hamburguer', 'sorvete', 'bar', 'jantar', 'cafe', 'onibus', 'metro', 'sapato', 'livro', 'pneu', 'dentista', 'racao', 'churrasco', 'sushi'],
  M: ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  B: ['aluguel', 'luz', 'conta de luz', 'agua', 'internet', 'condominio', 'academia', 'celular', 'netflix', 'escola', 'fatura do nubank', 'cartao', 'gas', 'iptu', 'seguro', 'plano de saude', 'faculdade', 'boleto da moto', 'financiamento'],
  S: ['salario', 'freela', 'pix do joao', 'comissao', 'bico', 'venda do carro', 'bonus', 'decimo terceiro', 'ferias', 'cliente', 'trabalho extra', 'minha mae'],
};

const T = {
  hello: [
    '(oi|ola|opa|oie|eae|e ai|eai|hey|ei|salve|fala|alo|bom dia|boa tarde|boa noite|hello|hi)',
    '(oi|ola|opa|oie|eae|e ai|fala|salve|bom dia|boa tarde|boa noite) (prumo|amigo|pessoal|parceiro|cara|mano|meu amigo|tudo certo|assistente|galera|moco|querido|)',
    '(oi|ola|opa|e ai) (de novo|voltei|cheguei|to aqui|estou aqui|tem alguem ai|ta ai|voce esta ai|vc ta ai)',
    '(muito prazer|prazer|prazer em te conhecer|como vai voce prumo|fala comigo|vamos conversar|quero conversar|posso falar com voce)',
    '(bom dia|boa tarde|boa noite|oi|ola) (tudo bem|tudo bom|tudo certo|como vai|como voce esta|blz|beleza)',
    '(oi|ola) (bom dia|boa tarde|boa noite)',
    '(fala ai|fala tu|fala meu bom|e ai meu chapa|coe|qual foi|iae|ae)',
  ],
  how: [
    '(tudo bem|tudo bom|tudo certo|tudo joia|tudo beleza|td bem|td bom|blz|beleza|como vai|como voce esta|como vc esta|como vc ta|como voce ta|como tu ta|como esta)',
    '(tudo bem|tudo bom|tudo certo|como vai) (com voce|contigo|com vc|por ai|ai|prumo|amigo|)',
    '(e voce|e vc|e tu) (como esta|como vai|tudo bem|ta bem|)',
    '(como foi seu dia|como esta seu dia|como ta o dia|ta tudo bem ai|como andam as coisas|quais as novidades|o que me conta|e as novidades|voce esta bem|vc ta bem|ta de boa|ta suave)',
  ],
  thanks: [
    '(obrigado|obrigada|brigado|brigada|valeu|vlw|muito obrigado|muito obrigada|agradecido|grato|grata|obg|thanks|tmj|valeu mesmo|show valeu)',
    '(obrigado|obrigada|valeu|brigado) (pela ajuda|prumo|amigo|cara|mano|por tudo|mesmo|meu amigo|ai|demais|viu)',
    '(ajudou muito|me ajudou bastante|foi de grande ajuda|agradeco|agradeco a ajuda|muito grato pela ajuda|valeu pela forca|obrigado por me ajudar|gratidao)',
  ],
  bye: [
    '(tchau|ate mais|ate logo|ate depois|flw|falou|fui|adeus|bye|ate amanha|ate breve|ate a proxima|tchauzinho|xau|inte|vou nessa|vou indo|to indo|preciso ir|tenho que ir|boa noite ate amanha|fica com deus|se cuida|falou entao)',
    '(tchau|ate mais|falou) (prumo|amigo|cara|mano|ate mais|ate logo|tchau|obrigado)',
    '(por hoje e so|era so isso|so isso mesmo|nao preciso de mais nada|acabou por hoje|encerrar conversa|terminamos por aqui)',
  ],
  who: [
    '(quem e voce|quem e vc|quem es tu|quem ta falando|com quem eu to falando|com quem estou falando|o que e voce|o que e vc|voce e o que|voce e um robo|vc e robo|voce e uma pessoa|voce e humano|voce e de verdade|voce e uma ia|voce e inteligencia artificial|qual seu nome|qual o seu nome|como voce se chama|como vc se chama|como te chamo|voce tem nome|voce e o prumo|me fala de voce|fala sobre voce|se apresenta|quantos anos voce tem|onde voce mora|quem te criou|quem fez voce|quem te fez|de onde voce veio|voce usa internet|voce e o chatgpt|voce e a alexa|voce e a siri)',
  ],
  help: [
    '(ajuda|socorro|me ajuda|preciso de ajuda|help|me da uma ajuda|pode me ajudar|voce pode me ajudar|ajuda ai|me ajuda ai|nao sei usar|como usa|como usar|como funciona|como isso funciona|como funciona isso aqui|como funciona o app|como eu uso isso|nao entendi como usa)',
    '(o que voce faz|o que vc faz|o que voce sabe fazer|o que voce consegue fazer|o que vc sabe|o que da pra fazer aqui|o que eu posso fazer aqui|o que eu posso te pedir|o que posso pedir|o que posso falar|quais comandos|quais sao os comandos|lista de comandos|me mostra os comandos|me da exemplos|me da um exemplo|exemplos de comandos|pra que voce serve|pra que serve isso|para que serve esse app|qual sua funcao|me ensina a usar|me explica como funciona|por onde eu comeco|por onde comeco)',
  ],
  praise: [
    '(muito bom|muito boa|voce e demais|vc e demais|voce e otimo|voce e incrivel|que legal|que massa|show|show de bola|top|top demais|perfeito|maravilha|sensacional|excelente|parabens|ficou otimo|adorei|gostei|amei|gostei muito|mandou bem|boa|arrasou|que demais|ta otimo|que app bom|melhor app|esse app e bom|adorei o app|gostei de voce|voce e inteligente|voce e fera|genial|nossa muito bom|voce e legal|ficou lindo|que incrivel)',
  ],
  insult: [
    '(voce e burro|vc e burro|burro|idiota|inutil|lixo|que lixo|voce nao serve pra nada|nao serve pra nada|voce e ruim|muito ruim|pessimo|horrivel|que droga|droga|porcaria|que porcaria|bosta|que merda|merda|voce e chato|chato|cala a boca|voce nao entende nada|vc nao entende nada|nao entende nada|voce e lento|nao funciona|isso nao funciona|nao ta funcionando|ta errado|voce errou|errou tudo|nada a ver|que resposta ruim|nao foi isso que eu disse|nao foi isso que eu pedi|nao era isso|voce nao me entende|ta dificil|desisto|que raiva|to com raiva de voce|odeio esse app|odeio voce|nao gostei|odiei|aff|affs|pqp)',
  ],
  ack: [
    '(ok|okay|okey|ta|ta bom|ta certo|tudo certo entao|certo|entendi|entendido|beleza entao|blz entao|legal|ata|ah ta|aham|uhum|hum|hmm|sei|ah sim|ah entendi|compreendi|ciente|combinado|fechou|fechado|tranquilo|de boa|suave|kkk|kk|haha|rsrs|hehe|kkkk|rs|lol|hahaha|nossa|eita|caramba|vixe|uau|puxa|poxa|serio|e mesmo|verdade|pois e|ne|hmm entendi|deixa pra la|esquece|nada nao|nada|deixa quieto|tanto faz|sei la|talvez|depois eu vejo|vou pensar|vou ver depois|depois vejo)',
  ],
  yes: [
    '(sim|s|isso|isso mesmo|exato|exatamente|correto|pode|pode sim|pode ser|pode lancar|pode fazer|pode marcar|pode confirmar|confirma|confirmo|confirmado|claro|claro que sim|com certeza|manda ver|manda bala|faz isso|faz ai|quero|quero sim|e isso|e isso ai|sim por favor|sim pode|isso ai|positivo|bora|vamos|vai|vai la|lanca sim|ta certo pode|certinho|afirmativo)',
  ],
  no: [
    '(nao|n|nao obrigado|nao precisa|nao quero|agora nao|nem|nao pode|nao faz isso|nao faca|nao lanca|nao era isso nao|negativo|cancela|cancelar|cancela isso|melhor nao|nao nao|de jeito nenhum|nunca|pode cancelar|para|pare|parar|volta|desiste|nao obrigada|nao por enquanto|ainda nao|nao e isso)',
  ],
  broke: [
    '(to|tou|estou|ando|fiquei|to meio|estou meio|to muito|estou muito) (sem dinheiro|sem grana|sem um real|quebrado|quebrada|liso|lisa|duro|dura|endividado|endividada|devendo muito|apertado de grana|apertada de grana|na pindaiba|no vermelho|sem saida|enrolado com dinheiro|enrolada com as contas|preocupado com dinheiro|preocupada com dinheiro|desesperado com as contas|desesperada com as contas)',
    '(nao sei o que fazer com minhas contas|minhas contas nao fecham|o dinheiro nao da|o dinheiro nao ta dando|o salario nao da|o dinheiro acaba rapido|meu dinheiro some|meu dinheiro acaba antes do mes|nao consigo guardar nada|nao consigo economizar|nao sobra nada|nunca sobra nada|gasto mais do que ganho|as contas estao atrasando|ta tudo caro|ta dificil pagar as contas|ta dificil fechar o mes|nao to conseguindo pagar tudo|minha vida financeira ta uma bagunca|minhas financas estao uma bagunca|to perdido nas financas|estou perdida nas contas|preciso organizar minha vida financeira|socorro minhas contas)',
  ],
  out: [
    '(qual a capital da franca|quem ganhou o jogo|quem ganhou a copa|como esta o tempo|vai chover hoje|qual a previsao do tempo|que horas sao|que dia e hoje|me conta uma piada|conta uma piada|me conta uma historia|canta uma musica|toca uma musica|qual sua cor favorita|qual seu time|voce gosta de futebol|quem e o presidente|em quem voce vota|como faz bolo de chocolate|receita de bolo|me da uma receita|o que tem pra jantar|qual o melhor filme|recomenda uma serie|me indica um filme|como aprender ingles|traduz isso pra ingles|escreve um poema|faz um poema|faz meu trabalho de escola|me ajuda na prova|quanto e dois mais dois|qual a raiz quadrada de nove|como programar em python|me explica fisica quantica|como perder peso|o que e amor|qual o sentido da vida|voce acredita em deus|quem descobriu o brasil|quantos paises existem|qual o maior rio do mundo|como consertar a pia|como trocar um pneu|onde fica o aeroporto|me passa o numero do bombeiro|abre o youtube|abre o instagram|manda mensagem pro joao|liga pra minha mae|desliga o computador|aumenta o volume|qual a noticia de hoje|o que aconteceu no mundo|quem e neymar|quem e o messi|qual o melhor carro|como plantar tomate|como cuidar de cachorro|meu gato ta doente|to com dor de cabeca|estou com fome|to com sono|to cansado|estou entediado|to feliz hoje|hoje ta frio|hoje ta calor|gosto de pizza|meu cachorro fugiu|fui na praia ontem|meu time perdeu|comprar acao da petrobras|em qual acao devo investir|vale a pena comprar bitcoin|qual o melhor investimento|devo investir em cripto|qual a cotacao do dolar|quanto ta o dolar)',
    '(voce sabe|me fala|me diz|sabe me dizer|pode me dizer) (quem ganhou o jogo|qual a capital do japao|como faz arroz|como chegar no centro|a previsao do tempo|uma curiosidade|o resultado da loteria|quem e o melhor jogador|como fazer um bolo|que dia e o carnaval|o horario do onibus|a historia do brasil)',
    '(asdf|qwerty|bla bla bla|teste|testando|testando um dois|123|abc|xyz|lorem ipsum|aaaa|sdfkj|hgfd|zzz|bananas azuis|cadeira voadora|o rato roeu a roupa|batata frita voadora)',
  ],
  spend: [
    '(gastei|paguei|comprei|torrei|foram|saiu|sairam|deu|foi) $A (no|na|em|de|com|pro|pra|do|da) $I',
    '(lanca|lancar|anota|anotar|registra|registrar|coloca|colocar|bota|botar|mete|poe|adiciona|adicionar|inclui|incluir|marca|marcar) (ai|la|pra mim|aqui|um gasto de|uma compra de|gasto de|) $A (no|na|em|de|com|do|da|pro) $I',
    '(acabei de gastar|acabei de comprar|tive um gasto de|fiz uma compra de|fiz um gasto de|hoje gastei|ontem gastei|ontem comprei|hoje comprei|torrei|meti) $A (no|na|em|de|com) $I',
    '$I (deu|foi|saiu|custou|ficou em|ficou|sairam) $A',
    '$A (no|na|de|em|com) $I',
    '(comprei|peguei|pedi|tomei|abasteci) (um|uma|o|a|) $I (por|de|a|custou|deu|) $A',
    '(novo gasto|registrar gasto|lancar despesa|nova despesa|quero lancar um gasto|quero registrar um gasto|adicionar gasto|anotar uma despesa|lanca um gasto|preciso lancar uma compra|tive uma despesa)',
    '(gastei|torrei|fui no|passei no|deixei) $A (hoje|ontem|agora|la) (no|na|em) $I',
  ],
  income: [
    '(recebi|ganhei|entrou|caiu|pingou|chegou|fiz) $A (de|do|da|no|em|pelo|pela) $S',
    '(lanca|anota|registra|coloca|bota) (ai|uma entrada de|uma renda de|entrada de|renda extra de|) $A (de|do|da) $S',
    '(caiu|entrou|pingou) (o|a|meu|minha|) $S (de|) $A',
    '(me pagaram|me deram|me mandaram|me transferiram|depositaram|me fizeram um pix de|o cliente me pagou|consegui|faturei|tirei) $A (de|do|da|pelo|hoje|na conta|)',
    '(nova entrada|registrar entrada|lancar renda extra|nova renda|recebi um dinheiro|entrou um dinheiro|caiu um dinheiro na conta|ganhei uma grana|entrou uma grana)',
    '$S (caiu|entrou|pingou|chegou) (hoje|agora|na conta|)',
  ],
  pay: [
    '(paguei|quitei|ja paguei|acabei de pagar|consegui pagar|ja quitei|resolvi|fiz o pagamento|fiz o pix|ja acertei|acertei) (o|a|do|da|de|meu|minha|) $B',
    '(marca|marcar|da baixa|dar baixa|baixa|coloca|deixa|poe) (o|a|no|na|em|) $B (como paga|como pago|paga|pago|quitada|quitado|)',
    '(o|a|meu|minha|) $B (ja ta paga|ja ta pago|esta paga|esta pago|ta paga|ta pago|foi paga|foi pago|ja foi|paga|paguei|quitada|quitado)',
    '(pode marcar|pode dar baixa|pode dar como pago|da como pago|da como paga) (o|a|no|na|) $B',
  ],
  unpay: [
    '(desmarca|desmarcar|tira|tirar|retira|remove) (o|a|) (pagamento|baixa|) (do|da|de|o|a|) $B',
    '(nao paguei|ainda nao paguei|na verdade nao paguei|me enganei nao paguei|esqueci de pagar) (o|a|) $B',
    '(deixa|coloca|volta|marca|poe) (o|a|) $B (em aberto|como nao paga|como nao pago|como pendente|pra pagar|pendente|nao paga)',
    '(o|a|) $B (nao foi paga|nao foi pago|ainda ta em aberto|continua em aberto|ta em aberto|voltou a ficar em aberto)',
  ],
  reserve_deposit: [
    '(guardei|guarda|guardar|deposita|depositar|depositei|coloca|colocar|coloquei|bota|botar|botei|poe|adiciona|adicionar|manda|joga|separei|separa) $A (na|pra|para|em|para a|pra a|no) (reserva|minha reserva|reserva de emergencia|poupanca|caixinha de emergencia|colchao financeiro)',
    '(aumenta|reforca|engorda|alimenta) (a|minha|) reserva (com|em|) $A',
    '(reserva|minha reserva) (recebeu|ganhou|mais) $A',
  ],
  reserve_withdraw: [
    '(tira|tirar|tirei|retira|retirar|retirei|saca|sacar|saquei|pega|peguei|pegar|usei|usar|resgata|resgatar|resgatei) $A (da|de|do|na) (reserva|minha reserva|reserva de emergencia|poupanca|caixinha de emergencia)',
    '(precisei|tive que|vou) (usar|tirar|pegar|mexer em) $A (da|na) reserva',
  ],
  newbill: [
    '(nova conta|novo boleto|nova despesa fixa|nova conta fixa|cria uma conta|criar uma conta|criar conta|cadastra uma conta|cadastrar conta|cadastrar uma conta nova|adiciona uma conta|adicionar conta|quero cadastrar uma conta|quero criar uma conta|tenho uma conta nova|apareceu uma conta nova|inclui um boleto|novo pagamento mensal) (de|da|do|chamada|) ($B|$I|) ($A|) (dia 10|dia 5|dia 15|dia 20|vence dia 12|todo dia 8|)',
    '(comecei a pagar|assinei|agora pago|vou comecar a pagar|fiz uma assinatura de) $B (todo mes|por mes|mensal|) ($A|)',
  ],
  q_saldo: [
    '(qual|quanto|como) (e|ta|esta|) (o|meu|o meu|) (saldo|saldo do mes|saldo atual|saldo de hoje)',
    '(quanto|o quanto) (sobra|sobrou|vai sobrar|ainda sobra|me sobra|resta|me resta|falta sobrar) (esse mes|este mes|no mes|agora|pra mim|desse mes|)',
    '(quanto eu tenho|quanto tenho|quanto dinheiro eu tenho|quanto dinheiro tenho|quanto ainda tenho|tenho quanto|quanto de dinheiro eu tenho|ainda tenho dinheiro|me mostra meu saldo|me fala meu saldo|ver saldo|ver meu saldo|mostra o saldo|consulta o saldo|meu saldo|saldo|sobra|como estou esse mes|como to esse mes|como ta meu mes|como ta o mes|como estao as coisas esse mes|to no azul|estou no azul|ta sobrando dinheiro|sobrou algo|fechei no azul|como anda meu dinheiro|como ta meu dinheiro|como estao minhas financas|como andam minhas financas|me da um resumo|resumo do mes|como vai o mes)',
  ],
  q_contas: [
    '(quais|que|quantas) contas (faltam|falta|tem|ainda faltam|estao|ainda tenho|tenho que|preciso|vou) (pagar|em aberto|abertas|atrasadas|pra pagar|vencer|)',
    '(o que|oque) (falta pagar|vence|vence hoje|vence essa semana|vence amanha|tenho pra pagar|preciso pagar|tenho que pagar|ta vencendo|ta atrasado|vai vencer)',
    '(tem|tenho|existe|ha) (alguma|) (conta|boleto) (pra pagar|vencendo|atrasada|atrasado|em aberto|pra hoje|hoje|essa semana|)',
    '(minhas contas|contas em aberto|contas atrasadas|contas do mes|lista de contas|me mostra as contas pendentes|me fala as contas|quais boletos faltam|quanto falta pagar|quanto ainda devo pagar|quanto devo esse mes|estou devendo algo|to devendo alguma coisa|paguei tudo|ja paguei tudo|falta alguma conta|ficou alguma conta pra tras|esqueci de pagar alguma conta|proximas contas|proximos vencimentos|quando vence minha proxima conta)',
  ],
  q_reserva: [
    '(quanto|qual) (tem|tenho|ta|esta|e o valor|e o saldo|guardei|ja guardei|juntei|ja juntei) (na|da|em|de|) (reserva|minha reserva|reserva de emergencia|poupanca|guardado)',
    '(minha reserva|reserva|como ta minha reserva|como esta minha reserva|como anda a reserva|ver reserva|quanto eu tenho guardado|quanto tenho guardado|quanto ja guardei|quanto tenho na poupanca|saldo da reserva|valor da reserva|tenho quanto guardado|qual o valor guardado)',
  ],
  q_renda: [
    '(quanto|qual) (e|ta|esta|) (ganho|recebo|eu ganho|eu recebo|minha renda|a minha renda|meu salario|o meu salario|ganho por mes|recebo por mes|entra por mes|entra na conta)',
    '(minha renda|renda do mes|meu salario|qual minha renda|qual meu salario|quanto entra|quanto entrou|quanto entrou esse mes|quanto recebi esse mes|quanto ganhei esse mes|quanto ganhei|quanto recebi|total de entradas|me fala minha renda)',
  ],
  q_gastos: [
    '(quanto|o quanto) (gastei|ja gastei|eu gastei|eu ja gastei|to gastando|estou gastando|vou gastar|gasto|torrei|ja torrei|saiu|ja saiu) (esse mes|este mes|no mes|ate agora|hoje|por mes|no total|)',
    '(meus gastos|gastos do mes|total de gastos|total gasto|quanto foi embora|ver gastos|ver meus gastos|me mostra os gastos|me fala meus gastos|como estao meus gastos|como ta meus gastos|to gastando muito|estou gastando muito|gastei muito|gastei demais esse mes|com o que eu mais gasto|onde to gastando mais|onde gasto mais|qual meu maior gasto|qual minha despesa maior|minhas despesas|despesas do mes)',
  ],
  fc_month: [
    '(como fica|como vai ficar|como vai ser|como sera|como ta|como esta|quanto vai sobrar em|quanto sobra em|quanto vou ter em|quanto vai ter em|o que me espera em|previsao de|previsao pra|previsao para|vou ter dinheiro em|vai dar em|vai sobrar em|sobra algo em|vai faltar em|vou conseguir fechar|como fecha|como vou estar em|e em|e) $M',
    '(to sem grana pra|vou ficar sem grana em|vai faltar dinheiro em|vai dar pra fechar|sera que fecho|sera que da em|como vou fechar) $M',
    '(como fica|como vai ser|quanto vai sobrar|quanto sobra|quanto vou ter|previsao|vou ter dinheiro|vai dar|vai sobrar algo|vai faltar dinheiro|como vai ficar|como fecha) (o mes que vem|mes que vem|no mes que vem|o proximo mes|proximo mes|no proximo mes|pro mes que vem)',
  ],
  fc_worst: ['(qual o|qual e o|qual vai ser o|me fala o|me diz o|) (mes mais apertado|pior mes|mes mais dificil|mes mais critico|mes mais complicado|mes mais pesado|mes mais puxado|mes que vai apertar|mes que vai ser ruim|mes que aperta mais)', '(quando vai apertar|quando vou ficar apertado|qual mes vai pesar mais|qual mes eu devo ter cuidado|em que mes vou ter problema|que mes vai ser pior|quando aperta)'],
  fc_best: ['(qual o|qual e o|qual vai ser o|me fala o|me diz o|) (melhor mes|mes mais folgado|mes mais tranquilo|mes mais leve|mes com mais sobra|mes que sobra mais|mes mais de boa)', '(quando vai sobrar mais|em que mes sobra mais|qual mes vai ser melhor|que mes vai ser mais tranquilo|quando vou ter mais dinheiro|quando fico mais folgado)'],
  fc_why: [
    '(por que|porque|pq|como|o que) (minha nota|a minha nota|a nota) (e essa|ta baixa|esta baixa|caiu|ta assim|e tao baixa|e baixa|melhora|pode melhorar|sobe|subiu|puxa|pesa)',
    '(como melhorar|como subir|como aumentar|o que fazer pra subir|o que fazer para melhorar|o que derruba|o que puxa|o que pesa na|me explica|explica) (minha nota|a nota|minha saude financeira|meu score|minha pontuacao)',
    '(qual minha nota|qual a minha nota|minha nota|minha pontuacao|minha saude financeira|como ta minha saude financeira|como esta minha saude financeira|como anda minha saude financeira|nota financeira|meu score|qual meu score)',
  ],
  fc_tips: [
    '(me da|me de|tem|da|manda|me passa|quero|preciso de|alguma|uma) (uma|alguma|umas|) (dica|dicas|sugestao|sugestoes|conselho|conselhos|orientacao|ideia) (pra mim|financeira|financeiras|de economia|pra economizar|pra guardar dinheiro|)',
    '(o que eu posso melhorar|o que posso melhorar|o que eu devo fazer|o que devo fazer|o que eu preciso mudar|o que preciso fazer|como posso economizar|como economizar|como gastar menos|onde posso cortar|o que posso cortar|o que da pra cortar|como guardar mais dinheiro|como sobrar mais|como melhorar minhas financas|como organizar meu dinheiro|me ajuda a economizar|me ajuda a gastar menos|quero economizar|quero gastar menos|o que voce recomenda|o que voce acha que devo fazer|tem como melhorar)',
  ],
  fc_goal: ['(quando|quanto tempo|em quanto tempo|daqui quanto tempo|em quantos meses|quantos meses) (eu chego|chego|vou chegar|falta|falta pra|falta para|demora|demoro|vai demorar|levo|leva) (na|a|pra|para|ate a|ate|) (meta|minha meta|meta da reserva|reserva completa|completar a reserva|encher a reserva|bater a meta)', '(quando bato a meta|quando completo minha reserva|falta muito pra meta|falta muito para minha reserva|to perto da meta|estou perto da meta|quando a reserva fica pronta|quanto falta pra meta da reserva)'],
  fc_goals: ['(quanto|qual valor|quanto dinheiro) (preciso|tenho que|devo|eu preciso|eu tenho que) (guardar|juntar|separar|poupar) (pras|para as|para minhas|pra minhas) metas', '(minhas metas cabem|as metas cabem|da pra cumprir minhas metas|vou conseguir cumprir as metas|como estao minhas metas|como andam minhas metas|consigo bater minhas metas|vou bater minhas metas|cabe guardar pras metas|quanto as metas pedem)'],
  fc_negative: ['(vou|eu vou|sera que vou|to pra|posso|vou acabar) (ficar|entrar|fechar|cair) (no|em|) (negativo|vermelho|devendo|no prejuizo)', '(vai faltar dinheiro|vai faltar grana|vai faltar|algum mes vai faltar dinheiro|tem algum mes negativo|tem mes no vermelho|algum mes no vermelho|algum mes negativo|vou conseguir pagar tudo|vai dar pra pagar tudo|da pra pagar tudo nos proximos meses|corro risco de ficar sem dinheiro|vou ficar sem dinheiro|vou quebrar|vou falir|o dinheiro vai acabar)'],
  fc_total: ['(quanto|o quanto) (vai sobrar|sobra|vou ter|vou juntar|consigo juntar|vou conseguir guardar|fica) (nos proximos meses|nos proximos 6 meses|nos proximos seis meses|no semestre|nesse semestre|ate abril|em seis meses|em 6 meses)', '(previsao dos proximos meses|previsao do semestre|como ficam os proximos meses|como vao ser os proximos meses|resumo dos proximos meses|proximos meses|sobra do semestre|e o futuro|como vai ser o futuro|como esta meu futuro financeiro|qual a previsao|me mostra a previsao|me fala a previsao)'],
  fc_afford: [
    '(posso|consigo|da pra|da para|cabe|tenho como|sera que posso|sera que da pra|tem como|e se eu|e se|sobra pra|vai dar pra|rola|tem condicao de) (gastar|comprar|pagar|parcelar|torrar|pegar|uma compra de|um gasto de) (um|uma|o|a|) ($I|) (de|por|) $A (em $M|esse mes|este mes|no mes que vem|em 3x|em 10 vezes|em 12 parcelas|)',
    '(da pra|cabe|posso|consigo|rola) (eu |)(comprar|pegar|gastar com|pagar) (um|uma|o|a|) $I (de|por|custando|que custa) $A',
    '$A (cabe|da|da pra gastar|e muito|pesa|vai pesar|vai apertar|cabe no orcamento) (esse mes|em $M|pra mim|no meu orcamento|)',
    '(tenho dinheiro|sobra dinheiro|tenho grana) (pra|para) (um|uma|o|a|) $I (de|por) $A',
  ],
  statement: [
    '(extrato|extratos|meu extrato|o extrato|extrato do banco|extrato bancario|arquivo ofx|ofx|arquivo do banco|csv do banco)',
    '(enviar|envia|mandar|manda|importar|importa|subir|sobe|carregar|carrega|anexar|anexa|colocar|coloca|botar|bota|jogar|joga|upload|fazer upload|dar upload|quero enviar|quero mandar|quero importar|quero subir|tenho|baixei|vou mandar|preciso importar|como importo|como envio|como coloco) (o|meu|um|o meu|do|de|) (extrato|extrato do banco|extrato bancario|arquivo do banco|ofx|csv do banco|movimentacoes do banco)',
    '(importar minhas compras do banco|puxar as compras do banco|trazer os gastos do banco|ler meu extrato|importa as movimentacoes|como trago meus gastos do banco|quero importar do nubank|importar do itau|pegar os dados do banco)',
  ],
  nav: [
    '(abrir|abre|abra|ir para|ir pra|vai para|vai pra|va para|va pra|mostrar|mostra|mostre|ver|entrar em|entra em|entra na|entra no|me leva pra|me leva para|me leve para|quero ver|quero abrir|quero ir pra|acessar|acessa|pagina de|tela de|aba de|volta pra|volta para|voltar para) (o|a|os|as|minha|meu|minhas|meus|) (cartoes|cartao|fluxo de caixa|fluxo|visao geral|inicio|painel|reserva|renda|configuracoes|ajustes|contas|casa|moradia|previsor|metas|tela inicial)',
  ],
};

// Fora do assunto
SLOTS.N = ['2', '3', '5', '7', '10', '20', '30', '40', '200', 'cinco', 'dez', 'vinte', 'trinta'];
const VIDA = [
  '(o|a|meu|minha) (ceu|porta|janela|rua|cidade|vizinho|chefe|tia|irma|primo|carro|casa|amigo|namorada|professor|cachorro|gato) (e|esta|ta|ficou|foi|mora|chegou|saiu|quebrou|sumiu|apareceu) (azul|aberta|fechada|legal|bonito|longe|em casa|cedo|tarde|ontem|na rua|de ferias|feliz|triste|em recife|em sao paulo|)',
  '(a luz|a internet|a agua|o gas|o mercado|a padaria|a farmacia|o onibus|o uber|a academia|a escola) (apagou|acabou|caiu|fechou|abriu|atrasou|chegou|esta lotada|ta lotado|ta longe|e perto|e bonita|voltou|parou)',
  '(tenho|meu filho tem|minha filha tem|meu pai tem|ela tem|ele tem|minha mae tem) $N (anos|filhos|gatos|cachorros|irmaos|primos)',
  '(nasci em|me formei em|casei em|moro aqui desde|comecei em) (1990|2005|1985|2010|1999|2018)',
  '(vi|encontrei|tinha|contei|conheci) $N (pessoas|carros|amigos|cachorros|criancas) (no|na) $I',
  '(corri|andei|caminhei|dirigi|nadei|pedalei|estudei|dormi) $N (km|quilometros|metros|horas|minutos) (hoje|ontem|)',
  '(moro no numero|moro na casa|meu apartamento e o|sao|ja sao|acordei as|dormi as|cheguei as) $N (horas|)',
  '(comi|bebi|li|assisti) $N (pizzas|copos|livros|filmes|cafes|episodios) (hoje|ontem|)',
  '(hoje|ontem|amanha) (acordei tarde|tem prova|vou na praia|fui no medico|vi um filme|choveu muito|fez sol|tem jogo|vou viajar|e feriado|e meu aniversario|trabalhei muito)',
  '(quero|vou|preciso|gostaria de) (viajar|dormir|estudar|correr|comprar leite|sair|ir na praia|lavar o carro|ver um filme|arrumar a casa|cozinhar|descansar)',
  'o que voce acha (do|da|de) (governo|politica|presidente|escola|calor|inverno|carnaval|futebol|tecnologia|cidade|televisao)',
];
T.out = [...T.out, ...T.out, ...T.out, ...T.out, ...VIDA];

// Gírias
SLOTS.A.push('40 pau', '100 paus', '50 mango', '200 mangos', '30 pratas', '10 conto', '500 pila');
SLOTS.I.push('gasosa', 'busao', 'rango', 'breja', 'role', 'marmita', 'lanchinho', 'balada', 'corrida');
T.hello.push('(coe|coe mano|salve mano|salve parca|fala parca|fala vei|fala mano|eae parca|eae vei|eai mano|oi mano|ola mano|oi vei|fala tu mano|alo alo|tem alguem on|ta on)');
T.how.push('(tudo em cima|tudo na paz|tudo tranquilo|tudo na boa|como c ta|como ce ta|cm vc ta|td certo|td joia|td em cima|td bem ctg|td bem cmg|como q vc ta|como q ta)');
T.thanks.push('(vlw mano|vlw parca|vlw vei|tmj mano|tmj parca|brigadao|brigadao parca|obg mano|obg vc ajudou|tamo junto|ta salvo|me salvou|salvou demais)');
T.bye.push('(t mais|ate mais mano|vazei|vazando|to vazando|vou vazar|partiu|fui nessa|fui nessa mano|tchauzin|flw vlw|flw mano|fui ali|to saindo|to off|vou off|abraco)');
T.who.push('(vc e oq|vc e o q|oq vc e|q q vc e|vc e gente|vc e bot|vc e um bot|c e robo|ce e robo|quem e tu)');
T.help.push('(oq vc faz|oq c faz|oq da pra fazer aq|oq da pra fazer|oq eu falo|me ajuda ai pfv|ajuda ai pfv|ajuda pf|tem como me ajudar|como q usa|como q funciona|como mexe nisso)');
T.praise.push('(vc e brabo|brabo|braba|brabissimo|vc e monstro|monstro|mito|lenda|vc e foda|foda demais|mt bom|mt top|top dms|bom dms|chave|vc e chave|sinistro|irado|da hora|que da hora|mandou mt|mandou mt bem|show d bola|ta brabo|ficou brabo|ta top)');
T.insult.push('(vc e mt ruim|ruim dms|lixo dms|q lixo|vc n entende nd|n entende nd|n serve pra nd|vc n presta|vc e mt burro|mt burro|vai se ferrar|tnc|vsf|fdp|q bosta|ta bugado|bugou|travou tudo)');
T.ack.push('(blz|blz entao|slk|slc|mds|meu deus|tendi|tendeu|sla|vish|oxe|ixi|af|to ligado|ta ligado|tlgd|saquei|pode crer|demorou|firmeza|firmeza entao|pprt|vdd|eh|ah blz|ok blz|ok vlw|ata blz|hm|hmm|ssa|dboa|de boa entao|tranks)');
T.yes.push('(ss|ss pode|sim sim|pode pa|pode crer que sim|demoro sim|bora la|bora entao|mete bala|manda brasa|manda ai|pode mandar|aham sim|uhum sim|yes|claro q sim|c certeza|ctz|com ctz|lanca logo)');
T.no.push('(nn|nn quero|nao nao|n quero|n precisa|n pode|n lanca|nops|nope|nem a pau|nem pensar|nem ferrando|to fora|tira isso|sai fora|n era isso|n e isso)');
T.broke.push('(to|tou|ando|fiquei|c to|mano to) (lascado|lascada|ferrado|ferrada|fudido|fudida|zerado|zerada|na merda|na lona|sem bufunfa|sem um puto|sem nenhum|sem money|mal de grana|ruim de grana) (de grana|com as contas|esse mes|)', '(ta osso|ta foda|ta tenso|ta embaçado|ta complicado|ta puxado) (pagar tudo|as contas|esse mes|fechar o mes|de grana|viver assim|)', '(a grana n da|a grana acabou|a grana sumiu|acabou a grana|acabou o dinheiro|a grana ta curta|grana curta|o dinheiro n da|nunca sobra grana|n sobra nada)');
T.spend.push('(larguei|queimei|soltei|deixei|mandei|gastei|torrei|meti) $A (no|na|em|de|com) $I', '(foi|deu|saiu) $A (de|no|na) $I', '(lanca|anota|bota|mete) ai $A (de|no|na) $I (mano|pfv|pf|)');
T.income.push('(pingou|caiu|entrou) (a grana|o dinheiro|a bufunfa|o pix|o pagamento) (do|da|de) $S $A', '(pingou|caiu|entrou) $A (pila|conto|) (na conta|no pix|hoje|)', '(fiz|levantei|descolei|arrumei|tirei) $A (no|num|com|de) (bico|freela|corre|trampo)');
T.q_saldo.push('(qnt|qnto|qto|quanto|quanta) (eu tenho|tenho|de grana eu tenho|tem de grana|tem de dinheiro|grana tenho|grana eu tenho|grana tem|grana sobrou|sobra|sobrou|me sobra|ta sobrando|resta|dinheiro eu tenho|tenho na conta)', '(como ta a grana|como anda a grana|como ta minha grana|ver minha grana|quanta grana|cade meu dinheiro|cade minha grana|to com grana|tenho grana)');
T.q_contas.push('(oq|o q) (falta pagar|vence|vence hj|tenho pra pagar|tem pra pagar|ta atrasado|ta vencendo)', '(tem boleto|tem conta|tem algo) (pra hj|vencendo hj|atrasado|pra pagar hj|pra pagar)');
T.q_gastos.push('(to|tou|ando|estou) (torrando|queimando|gastando) (mt|muito|demais|dms|grana|muita grana|dinheiro demais)', '(qnt|qnto|qto) (ja torrei|torrei|gastei|ja gastei|saiu|ja saiu|to gastando) (esse mes|hj|ate agora|)', '(onde foi minha grana|pra onde foi minha grana|pra onde foi meu dinheiro|onde to torrando grana|com oq eu mais gasto)');
T.q_reserva.push('(qnt|qnto|qto) (tem|tenho|guardei|juntei) (na reserva|guardado|na poupanca)');
T.q_renda.push('(qnt|qnto|qto) (ganho|recebo|entra|entrou|caiu|cai por mes|pingou esse mes)');
T.fc_month.push('(vou ficar liso em|vou ficar duro em|vou ficar sem grana em|vai ter grana em|vou ter grana em|vai dar bom em|vai sobrar grana em|vai rolar grana em|sobra grana em) $M', '(como q fica|como q vai ser|e em|e) $M (mano|ai|ein|hein|)');
T.fc_negative.push('(vai faltar grana|vai faltar money|vou ficar liso|vou ficar duro|vou ficar zerado|vou me ferrar|vou me lascar|vou ficar no vermelho msm|vou quebrar msm|vou ficar devendo|vai dar ruim) (nos proximos meses|logo|msm|mano|)');
T.fc_tips.push('(me da|me passa|manda|solta|tem) (uma|umas|alguma|) (dica|dicas|ideia|ideias|moral) (ai|ai mano|mano|pra gastar menos|pra guardar grana|pra sobrar grana|)', '(como gastar menos grana|como sobrar grana|como guardar grana|como juntar grana|como parar de torrar grana|onde eu corto|oq eu corto|oq posso cortar|oq da pra cortar)');
T.fc_afford.push('(da pra|rola|cabe|consigo|tenho grana pra|sobra grana pra|ce acha que da pra|vc acha q da pra) (comprar|pegar|torrar|gastar|mandar ver em) (um|uma|o|a|) $I (de|por|) $A', '(da pra|rola|cabe) (um|uma|) $I (de|por) $A (msm|mano|ai|)');

module.exports = { SLOTS, T };

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  AttachmentBuilder,
  Events
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// CONFIGURAÇÃO
const CARGO_SUPORTE_NOME = 'Suporte Gzn Engine';
const CATEGORIA_TICKETS_NOME = '📞・atendimento';
const CATEGORIA_COMPRAS_NOME = '💻・otimizações';

const CANAL_TICKET_ID = process.env.CANAL_TICKET_ID;
const CANAL_COMPRA_ID = process.env.CANAL_COMPRA_ID;

// FUNÇÕES
const getRole = (g, name) => g.roles.cache.find(r => r.name === name);
const getCategory = (g, name) =>
  g.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);

const clean = (n) =>
  n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

// PAINEL SUPORTE
async function painelSuporte() {
  const canal = await client.channels.fetch(CANAL_TICKET_ID);
  if (!canal) return;

  const img = new AttachmentBuilder('./suporte.png');

  const embed = new EmbedBuilder()
    .setTitle('Suporte Gzn Engine')
    .setDescription('Selecione abaixo para abrir atendimento.')
    .setColor('#2b60ff')
    .setImage('attachment://suporte.png')

  const menu = new StringSelectMenuBuilder()
    .setCustomId('select_suporte')
    .setPlaceholder('Escolha o atendimento...')
    .addOptions([
      { label: 'Suporte Técnico', value: 'suporte', emoji: '🔧' },
      { label: 'Dúvidas', value: 'duvida', emoji: '❓' },
      { label: 'Parceria', value: 'parceria', emoji: '🤝' }
    ]);

  await canal.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
    files: [img]
  });
}

// PAINEL COMPRA
async function painelCompra() {
  const canal = await client.channels.fetch(CANAL_COMPRA_ID);
  if (!canal) return;

  const img = new AttachmentBuilder('./compra.png');

  const embed = new EmbedBuilder()
    .setTitle('Comprar Gzn Engine')
    .setDescription('Clique abaixo para comprar.')
    .setColor('#00b894')
    .setImage('attachment://compra.png')

  const btn = new ButtonBuilder()
    .setCustomId('comprar')
    .setLabel('Comprar')
    .setEmoji('💸')
    .setStyle(ButtonStyle.Success);

  await canal.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)],
    files: [img]
  });
}

// CRIAR TICKET
async function criarTicket(interaction, tipo, texto) {
  const g = interaction.guild;
  const user = interaction.user;

  const categoria = getCategory(
    g,
    tipo === 'compra' ? CATEGORIA_COMPRAS_NOME : CATEGORIA_TICKETS_NOME
  );

  const existente = g.channels.cache.find(c => c.topic?.includes(user.id));
  if (existente) {
    return interaction.reply({ content: 'Você já tem ticket aberto.', ephemeral: true });
  }

  const canal = await g.channels.create({
    name: `${tipo}-${clean(user.username)}`,
    type: ChannelType.GuildText,
    parent: categoria?.id,
    topic: user.id,
    permissionOverwrites: [
      { id: g.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle('Ticket Aberto')
    .setDescription(`Motivo: ${texto}`)
    .setThumbnail(user.displayAvatarURL())
    .setColor('#5865f2');

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('notificar').setLabel('Notificar').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('assumir').setLabel('Assumir').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('fechar').setLabel('Fechar').setStyle(ButtonStyle.Danger)
  );

  await canal.send({ content: `${user}`, embeds: [embed], components: [botoes] });

  interaction.reply({ content: `Ticket criado: ${canal}`, ephemeral: true });
}

// EVENTOS
client.once(Events.ClientReady, async () => {
  console.log('BOT ONLINE');

  await painelSuporte();
  await painelCompra();
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isStringSelectMenu()) {
      const modal = new ModalBuilder()
        .setCustomId('modal')
        .setTitle('Abrir Ticket');

      const input = new TextInputBuilder()
        .setCustomId('txt')
        .setLabel('Descreva seu problema')
        .setStyle(TextInputStyle.Paragraph);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await i.showModal(modal);
    }

    if (i.isButton() && i.customId === 'comprar') {
      const modal = new ModalBuilder()
        .setCustomId('modal_compra')
        .setTitle('Compra');

      const input = new TextInputBuilder()
        .setCustomId('txt')
        .setLabel('O que deseja comprar?')
        .setStyle(TextInputStyle.Paragraph);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await i.showModal(modal);
    }

    if (i.isModalSubmit()) {
      const texto = i.fields.getTextInputValue('txt');

      if (i.customId === 'modal') {
        criarTicket(i, 'ticket', texto);
      }

      if (i.customId === 'modal_compra') {
        criarTicket(i, 'compra', texto);
      }
    }

    if (i.isButton()) {
      if (i.customId === 'fechar') {
        i.reply({ content: 'Fechando...', ephemeral: true });
        setTimeout(() => i.channel.delete(), 3000);
      }

      if (i.customId === 'notificar') {
        i.channel.send('@here');
        i.reply({ content: 'Notificado', ephemeral: true });
      }

      if (i.customId === 'assumir') {
        i.reply({ content: 'Ticket assumido', ephemeral: true });
      }
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(process.env.TOKEN);
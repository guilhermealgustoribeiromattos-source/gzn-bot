require("dotenv").config();

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
  Events,
  AttachmentBuilder,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const CANAL_SUPORTE_ID = process.env.CANAL_SUPORTE_ID;
const CANAL_COMPRA_ID = process.env.CANAL_COMPRA_ID;

const CATEGORIA_TICKETS_NOME = "📞・atendimento";
const CATEGORIA_COMPRAS_NOME = "💻・otimizações";

function getCategory(guild, name) {
  return guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name,
  );
}

function cleanName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

function getExistingTicket(guild, userId, tipo) {
  return guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.topic &&
      c.topic.includes(`user:${userId}`) &&
      c.topic.includes(`tipo:${tipo}`),
  );
}

async function apagarPaineisAntigos(canal, marker) {
  const mensagens = await canal.messages.fetch({ limit: 20 }).catch(() => null);
  if (!mensagens) return;

  const antigas = mensagens.filter(
    (m) =>
      m.author.id === client.user.id &&
      m.embeds.length > 0 &&
      m.embeds[0].footer &&
      m.embeds[0].footer.text === marker,
  );

  for (const [, msg] of antigas) {
    await msg.delete().catch(() => {});
  }
}

async function painelSuporte() {
  const canal = await client.channels.fetch(CANAL_SUPORTE_ID).catch(() => null);
  if (!canal) return;

  await apagarPaineisAntigos(canal, "PAINEL_SUPORTE_GZN");

  const img = new AttachmentBuilder("./suporte.png");

  const embed = new EmbedBuilder()
    .setTitle("Seja muito bem-vindo(a) ao suporte da Gzn Engine")
    .setDescription(
      ">>> Estamos aqui para garantir que você tenha a melhor experiência possível. Se você precisa de ajuda com uma compra, tem dúvidas sobre um produto ou necessita de assistência técnica, você está no lugar certo.\n\n" +
      "Como funciona? Clique na opção abaixo para abrir um ticket privado com nossa equipe.\n\n" +
      "Por favor, seja paciente após abrir o ticket. Nossa equipe responderá o mais breve possível.\n\n" +
      "Transcreva o mais detalhado possível o seu tipo de problema/ajuda na descrição!"
    )
    .setColor("#2b60ff")
    .setImage("attachment://suporte.png")

  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_suporte")
    .setPlaceholder("Selecione o motivo do contato...")
    .addOptions([
      {
        label: "Suporte Técnico",
        description: "Problemas Técnicos / Erro / Bug",
        value: "suporte",
        emoji: "🛠️",
      },
      {
        label: "Dúvidas",
        description: "Tirar Dúvidas sobre Produtos",
        value: "duvida",
        emoji: "❓",
      },
      {
        label: "Parceria",
        description: "Parcerias e Propostas",
        value: "parceria",
        emoji: "🤝",
      },
    ]);

  await canal.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
    files: [img],
  });
}

async function painelCompra() {
  const canal = await client.channels.fetch(CANAL_COMPRA_ID).catch(() => null);
  if (!canal) return;

  await apagarPaineisAntigos(canal, "PAINEL_COMPRA_GZN");

  const img = new AttachmentBuilder("./compra.png");

  const embed = new EmbedBuilder()
    .setTitle("Comprar Painel / Otimização Gzn Engine")
    .setDescription(
      ">>> Estamos aqui para garantir que você tenha a melhor experiência possível. Se você precisa de ajuda com uma compra, tem dúvidas sobre um produto ou necessita de assistência técnica, você está no lugar certo.\n\n" +
        "Como funciona? Clique no botão/reação abaixo para abrir um ticket privado com nossa equipe.\n\n" +
        "Por favor, seja paciente após abrir o ticket. Nossa equipe responderá o mais breve possível.\n\n" +
        "Transcreva o mais detalhado possível o seu tipo de problema/ajuda na descrição!",
    )
    .setColor("#2b60ff")
    .setImage("attachment://compra.png")

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_compra")
      .setLabel("Comprar Painel")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({
    embeds: [embed],
    components: [row],
    files: [img],
  });
}

async function criarTicket(interaction, tipo, texto, titulo) {
  const guild = interaction.guild;
  const user = interaction.user;

  const categoria =
    tipo === "compra"
      ? getCategory(guild, CATEGORIA_COMPRAS_NOME)
      : getCategory(guild, CATEGORIA_TICKETS_NOME);

  const existente = getExistingTicket(guild, user.id, tipo);
  if (existente) {
    await interaction.reply({
      content: `Você já tem um ticket aberto: ${existente}`,
      ephemeral: true,
    });
    return;
  }

  const nomeCanal = `${tipo}-${cleanName(user.username) || user.id.slice(-4)}`;

  const canal = await guild.channels.create({
    name: nomeCanal,
    type: ChannelType.GuildText,
    parent: categoria ? categoria.id : null,
    topic: `user:${user.id} | tipo:${tipo}`,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎫 ${titulo}`)
    .setDescription(
      `Olá ${user}, seu ticket foi criado com sucesso.\n\n` +
        `**Descrição:**\n${texto}`,
    )
    .setColor(tipo === "compra" ? "#00b894" : "#5865f2")
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setFooter({
      text: user.username,
      iconURL: user.displayAvatarURL({ size: 256 }),
    });

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("notificar_ticket")
      .setLabel("Notificar")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("assumir_ticket")
      .setLabel("Assumir")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar")
      .setStyle(ButtonStyle.Danger),
  );

  await canal.send({
    content: `${user}`,
    embeds: [embed],
    components: [botoes],
  });

  await interaction.reply({
    content: `Ticket criado: ${canal}`,
    ephemeral: true,
  });
}

client.once(Events.ClientReady, async () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);

  await painelSuporte().catch(console.error);
  await painelCompra().catch(console.error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "select_suporte"
    ) {
      const motivo = interaction.values[0];

      const modal = new ModalBuilder()
        .setCustomId(`modal_${motivo}`)
        .setTitle("Abertura de Ticket");

      const input = new TextInputBuilder()
        .setCustomId("descricao")
        .setLabel("Descreva seu Problema ou Dúvida")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isButton() && interaction.customId === "abrir_compra") {
      await criarTicket(
        interaction,
        "compra",
        "Cliente abriu ticket de compra.",
        "Ticket de Compra",
      );
      return;
    }

    if (interaction.isModalSubmit()) {
      const texto = interaction.fields.getTextInputValue("descricao");

      if (interaction.customId === "modal_suporte") {
        await criarTicket(
          interaction,
          "suporte",
          texto,
          "Ticket de Suporte Técnico",
        );
        return;
      }

      if (interaction.customId === "modal_duvida") {
        await criarTicket(interaction, "duvida", texto, "Ticket de Dúvidas");
        return;
      }

      if (interaction.customId === "modal_parceria") {
        await criarTicket(interaction, "parceria", texto, "Ticket de Parceria");
        return;
      }
    }

    if (interaction.isButton() && interaction.customId === "notificar_ticket") {
      await interaction.channel.send("@here");
      await interaction.reply({
        content: "Equipe notificada.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === "assumir_ticket") {
      await interaction.reply({
        content: `Ticket assumido por ${interaction.user}.`,
        ephemeral: false,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === "fechar_ticket") {
      await interaction.reply({
        content: "Fechando ticket em 5 segundos...",
        ephemeral: true,
      });

      setTimeout(async () => {
        await interaction.channel.delete().catch(console.error);
      }, 5000);

      return;
    }
  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "Ocorreu um erro ao processar essa ação.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);

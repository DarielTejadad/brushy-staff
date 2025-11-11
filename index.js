const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildPresences
  ] 
});

// Configuración - Cambia estos valores según tu servidor
const CONFIG = {
  staffRoleId: '1437618918997884968', // Reemplaza con el ID de tu rol de staff
  logChannelId: '1437621223331725392', // Canal donde se registrarán las acciones
  ticketCategory: '1437619974054084618', // Categoría donde se crean los tickets
  welcomeChannel: '1437630515451658361', // Canal de bienvenida
  rulesChannel: '1437616147901059255' // Canal de reglas
};

// Almacenamiento temporal para advertencias y otros datos
const warnings = {};
const mutedUsers = new Set();

client.on('ready', () => {
  console.log(`✅ Bot Brushy Staff conectado como ${client.user.tag}`);
  console.log(`🔍 Bot ID: ${client.user.id}`);
  console.log(`🏠 Servidores: ${client.guilds.cache.size}`);
  
  // Registrar comandos slash
  const commands = [
    {
      name: 'panel',
      description: 'Muestra el panel de control del staff'
    },
    {
      name: 'usuario',
      description: 'Gestión de usuarios',
      options: [
        {
          name: 'accion',
          description: 'Selecciona una acción',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'info', value: 'info' },
            { name: 'roles', value: 'roles' },
            { name: 'kick', value: 'kick' },
            { name: 'ban', value: 'ban' },
            { name: 'advertencia', value: 'advertencia' },
            { name: 'quitar_roles', value: 'quitar_roles' }
          ]
        },
        {
          name: 'usuario',
          description: 'Usuario al que se le aplicará la acción',
          type: 6, // USER
          required: true
        },
        {
          name: 'razon',
          description: 'Razón de la acción',
          type: 3, // STRING
          required: false
        }
      ]
    },
    {
      name: 'servidor',
      description: 'Información y gestión del servidor',
      options: [
        {
          name: 'accion',
          description: 'Selecciona una acción',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'stats', value: 'stats' },
            { name: 'anuncio', value: 'anuncio' },
            { name: 'encuesta', value: 'encuesta' },
            { name: 'limpiar', value: 'limpiar' }
          ]
        },
        {
          name: 'cantidad',
          description: 'Cantidad de mensajes a limpiar (solo para limpiar)',
          type: 4, // INTEGER
          required: false
        }
      ]
    },
    {
      name: 'tickets',
      description: 'Gestión de tickets',
      options: [
        {
          name: 'accion',
          description: 'Selecciona una acción',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'resumen', value: 'resumen' },
            { name: 'cerrar_todos', value: 'cerrar_todos' },
            { name: 'crear_categoria', value: 'crear_categoria' }
          ]
        }
      ]
    },
    {
      name: 'sistema',
      description: 'Configuración del sistema',
      options: [
        {
          name: 'accion',
          description: 'Selecciona una acción',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'backup', value: 'backup' },
            { name: 'reiniciar', value: 'reiniciar' },
            { name: 'estado', value: 'estado' }
          ]
        }
      ]
    }
  ];

  client.application.commands.set(commands)
    .then(() => console.log('✅ Comandos registrados'))
    .catch(console.error);
});

// Verificar si el usuario es staff
function isStaff(member) {
  return member.roles.cache.has(CONFIG.staffRoleId) || member.permissions.has(PermissionFlagsBits.Administrator);
}

// Función para registrar logs
async function logAction(guild, action, moderator, target, reason) {
  try {
    const logChannel = guild.channels.cache.get(CONFIG.logChannelId);
    if (!logChannel) return;
    
    const embed = new EmbedBuilder()
      .setTitle(`📋 ${action}`)
      .addFields(
        { name: 'Moderador', value: `${moderator}`, inline: true },
        { name: 'Usuario afectado', value: `${target}`, inline: true },
        { name: 'Razón', value: reason || 'No especificada', inline: false }
      )
      .setColor(action.includes('Ban') || action.includes('Kick') ? 0xFF0000 : 0x00FF00)
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error al registrar log:', error);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  
  // Verificar si es staff
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar este comando.',
      ephemeral: true
    });
  }
  
  const { commandName } = interaction;
  
  if (commandName === 'panel') {
    // Crear panel principal
    const mainRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_usuarios')
          .setLabel('👥 Gestión de Usuarios')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_servidor')
          .setLabel('📊 Gestión del Servidor')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_tickets')
          .setLabel('🎫 Gestión de Tickets')
          .setStyle(ButtonStyle.Success)
      );
    
    const secondRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_sistema')
          .setLabel('⚙️ Configuración del Sistema')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_automatizacion')
          .setLabel('🤖 Automatización')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_logs')
          .setLabel('📜 Ver Logs')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const embed = new EmbedBuilder()
      .setTitle('🎛️ Panel de Control - Brushy Staff')
      .setDescription('Selecciona una opción para administrar el servidor')
      .setColor(0x3498db)
      .setFooter({ text: 'Brushy Staff | Sistema de Administración' });
    
    await interaction.reply({ embeds: [embed], components: [mainRow, secondRow] });
  } else if (commandName === 'usuario') {
    const accion = interaction.options.getString('accion');
    const usuario = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon') || 'No especificada';
    const miembro = await interaction.guild.members.fetch(usuario.id);
    
    switch (accion) {
      case 'info':
        const embed = new EmbedBuilder()
          .setTitle(`📋 Información de ${usuario.username}`)
          .setThumbnail(usuario.displayAvatarURL())
          .addFields(
            { name: 'ID', value: usuario.id, inline: true },
            { name: 'Apodo', value: miembro.nickname || 'Ninguno', inline: true },
            { name: 'Se unió', value: `<t:${parseInt(miembro.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: 'Cuenta creada', value: `<t:${parseInt(usuario.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Roles', value: miembro.roles.cache.map(r => r).join(' ') || 'Ninguno', inline: false }
          )
          .setColor(0x3498db);
        
        await interaction.reply({ embeds: [embed] });
        break;
        
      case 'roles':
        // Crear menú de selección de roles
        const roles = interaction.guild.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).first(25);
        
        const selectMenu = new SelectMenuBuilder()
          .setCustomId(`roles_${usuario.id}`)
          .setPlaceholder('Selecciona roles para asignar/quitar')
          .addOptions(
            roles.map(role => ({
              label: role.name,
              value: role.id,
              description: `ID: ${role.id}`,
              default: miembro.roles.cache.has(role.id)
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({
          content: `Selecciona los roles para ${usuario}`,
          components: [row]
        });
        break;
        
      case 'kick':
        if (!miembro.kickable) {
          return interaction.reply({
            content: '❌ No puedo expulsar a este usuario. Puede que tenga un rol más alto que el mío.',
            ephemeral: true
          });
        }
        
        await miembro.kick(razon);
        await interaction.reply(`✅ ${usuario.tag} ha sido expulsado del servidor.`);
        await logAction(interaction.guild, 'Usuario Expulsado', interaction.user, usuario, razon);
        break;
        
      case 'ban':
        if (!miembro.bannable) {
          return interaction.reply({
            content: '❌ No puedo banear a este usuario. Puede que tenga un rol más alto que el mío.',
            ephemeral: true
          });
        }
        
        await interaction.guild.bans.create(usuario.id, { reason: razon });
        await interaction.reply(`✅ ${usuario.tag} ha sido baneado del servidor.`);
        await logAction(interaction.guild, 'Usuario Baneado', interaction.user, usuario, razon);
        break;
        
      case 'advertencia':
        if (!warnings[usuario.id]) {
          warnings[usuario.id] = [];
        }
        
        warnings[usuario.id].push({
          moderator: interaction.user.id,
          reason: razon,
          date: new Date()
        });
        
        await interaction.reply(`✅ Se ha añadido una advertencia a ${usuario.tag}. Total: ${warnings[usuario.id].length}`);
        await logAction(interaction.guild, 'Advertencia Añadida', interaction.user, usuario, razon);
        
        // Enviar DM al usuario
        try {
          await usuario.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('⚠️ Has recibido una advertencia')
                .setDescription(`Razón: ${razon}`)
                .setColor(0xFF0000)
                .setFooter({ text: `Moderador: ${interaction.user.tag}` })
            ]
          });
        } catch (error) {
          console.log('No se pudo enviar DM al usuario');
        }
        break;
        
      case 'quitar_roles':
        await miembro.roles.set([]);
        await interaction.reply(`✅ Se han quitado todos los roles de ${usuario.tag}.`);
        await logAction(interaction.guild, 'Roles Quitados', interaction.user, usuario, 'Todos los roles');
        break;
    }
  } else if (commandName === 'servidor') {
    const accion = interaction.options.getString('accion');
    
    switch (accion) {
      case 'stats':
        const guild = interaction.guild;
        const miembros = await guild.members.fetch();
        const totalMiembros = guild.memberCount;
        const humanos = miembros.filter(m => !m.user.bot).size;
        const bots = miembros.filter(m => m.user.bot).size;
        const enLinea = miembros.filter(m => m.presence?.status === 'online').size;
        const ausente = miembros.filter(m => m.presence?.status === 'idle').size;
        const noMolestar = miembros.filter(m => m.presence?.status === 'dnd').size;
        const desconectado = miembros.filter(m => !m.presence || m.presence?.status === 'offline').size;
        
        const canales = guild.channels.cache;
        const texto = canales.filter(c => c.type === 0).size;
        const voz = canales.filter(c => c.type === 2).size;
        const categoria = canales.filter(c => c.type === 4).size;
        
        const embed = new EmbedBuilder()
          .setTitle(`📊 Estadísticas de ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '👥 Miembros', value: `Total: ${totalMiembros}\nHumanos: ${humanos}\nBots: ${bots}`, inline: true },
            { name: '🟢 Estado', value: `En línea: ${enLinea}\nAusente: ${ausente}\nNo molestar: ${noMolestar}\nDesconectado: ${desconectado}`, inline: true },
            { name: '📢 Canales', value: `Texto: ${texto}\nVoz: ${voz}\nCategorías: ${categoria}`, inline: true },
            { name: '📅 Creado', value: `<t:${parseInt(guild.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
            { name: '🔑 ID', value: guild.id, inline: true }
          )
          .setColor(0x3498db);
        
        await interaction.reply({ embeds: [embed] });
        break;
        
      case 'anuncio':
        // Crear modal para el anuncio
        const modal = new ModalBuilder()
          .setCustomId('anuncio_modal')
          .setTitle('Crear Anuncio');
        
        const tituloInput = new TextInputBuilder()
          .setCustomId('anuncio_titulo')
          .setLabel('Título del anuncio')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        
        const mensajeInput = new TextInputBuilder()
          .setCustomId('anuncio_mensaje')
          .setLabel('Mensaje del anuncio')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);
        
        const canalInput = new TextInputBuilder()
          .setCustomId('anuncio_canal')
          .setLabel('ID del canal (deja vacío para canal actual)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);
        
        const firstActionRow = new ActionRowBuilder().addComponents(tituloInput);
        const secondActionRow = new ActionRowBuilder().addComponents(mensajeInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(canalInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        
        await interaction.showModal(modal);
        break;
        
      case 'encuesta':
        // Crear modal para la encuesta
        const pollModal = new ModalBuilder()
          .setCustomId('encuesta_modal')
          .setTitle('Crear Encuesta');
        
        const preguntaInput = new TextInputBuilder()
          .setCustomId('encuesta_pregunta')
          .setLabel('Pregunta de la encuesta')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        
        const opcionesInput = new TextInputBuilder()
          .setCustomId('encuesta_opciones')
          .setLabel('Opciones (separadas por comas, máximo 10)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);
        
        const duracionInput = new TextInputBuilder()
          .setCustomId('encuesta_duracion')
          .setLabel('Duración en minutos (deja vacío para ilimitada)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);
        
        const pollFirstActionRow = new ActionRowBuilder().addComponents(preguntaInput);
        const pollSecondActionRow = new ActionRowBuilder().addComponents(opcionesInput);
        const pollThirdActionRow = new ActionRowBuilder().addComponents(duracionInput);
        
        pollModal.addComponents(pollFirstActionRow, pollSecondActionRow, pollThirdActionRow);
        
        await interaction.showModal(pollModal);
        break;
        
      case 'limpiar':
        const cantidad = interaction.options.getInteger('cantidad') || 10;
        
        if (cantidad < 1 || cantidad > 100) {
          return interaction.reply({
            content: '❌ La cantidad debe estar entre 1 y 100.',
            ephemeral: true
          });
        }
        
        await interaction.channel.bulkDelete(cantidad, true);
        await interaction.reply(`✅ Se han eliminado ${cantidad} mensajes.`);
        break;
    }
  } else if (commandName === 'tickets') {
    const accion = interaction.options.getString('accion');
    
    switch (accion) {
      case 'resumen':
        // Obtener todos los canales de tickets
        const ticketChannels = interaction.guild.channels.cache.filter(c => 
          c.name.includes('ticket-') && c.type === 0
        );
        
        const roles = {
          pendiente: '1437623936694095972',
          proceso: '1437623939332309154',
          terminado: '1437624169490550845',
          cancelado: '1437624196506193960'
        };
        
        const resumen = {
          pendiente: 0,
          proceso: 0,
          terminado: 0,
          cancelado: 0,
          total: ticketChannels.size
        };
        
        // Contar tickets por estado
        for (const [channelId, channel] of ticketChannels) {
          try {
            const messages = await channel.messages.fetch({ limit: 10 });
            const statusMessage = messages.find(m => 
              m.embeds && m.embeds[0] && m.embeds[0].title && 
              m.embeds[0].title.includes('Estado del Ticket Actualizado')
            );
            
            if (statusMessage) {
              const description = statusMessage.embeds[0].description;
              if (description.includes('pendiente')) resumen.pendiente++;
              else if (description.includes('proceso')) resumen.proceso++;
              else if (description.includes('terminado')) resumen.terminado++;
              else if (description.includes('cancelado')) resumen.cancelado++;
            } else {
              // Si no hay mensaje de estado, contar como pendiente
              resumen.pendiente++;
            }
          } catch (error) {
            console.error(`Error al procesar canal ${channel.name}:`, error);
            resumen.pendiente++;
          }
        }
        
        const embed = new EmbedBuilder()
          .setTitle('🎫 Resumen de Tickets')
          .setDescription(`Total de tickets: ${resumen.total}`)
          .addFields(
            { name: '⏳ Pendientes', value: `${resumen.pendiente}`, inline: true },
            { name: '🔄 En Proceso', value: `${resumen.proceso}`, inline: true },
            { name: '✅ Terminados', value: `${resumen.terminado}`, inline: true },
            { name: '❌ Cancelados', value: `${resumen.cancelado}`, inline: true }
          )
          .setColor(0x3498db)
          .setFooter({ text: 'Brushy Tickets | Sistema de Soporte' });
        
        await interaction.reply({ embeds: [embed] });
        break;
        
      case 'cerrar_todos':
        const confirmRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('confirmar_cerrar_tickets')
              .setLabel('✅ Confirmar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('cancelar_cerrar_tickets')
              .setLabel('❌ Cancelar')
              .setStyle(ButtonStyle.Danger)
          );
        
        await interaction.reply({
          content: '⚠️ ¿Estás seguro de que quieres cerrar todos los tickets? Esta acción no se puede deshacer.',
          components: [confirmRow]
        });
        break;
        
      case 'crear_categoria':
        // Crear una categoría para tickets si no existe
        const categoryName = '🎫 Tickets';
        let category = interaction.guild.channels.cache.find(c => 
          c.name === categoryName && c.type === 4
        );
        
        if (!category) {
          category = await interaction.guild.channels.create({
            name: categoryName,
            type: 4,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: interaction.client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
              }
            ]
          });
          
          await interaction.reply(`✅ Se ha creado la categoría ${category.name}`);
        } else {
          await interaction.reply('❌ La categoría de tickets ya existe.');
        }
        break;
    }
  } else if (commandName === 'sistema') {
    const accion = interaction.options.getString('accion');
    
    switch (accion) {
      case 'backup':
        // Crear un backup básico de la configuración del servidor
        const guild = interaction.guild;
        
        const backupData = {
          name: guild.name,
          icon: guild.iconURL(),
          ownerId: guild.ownerId,
          createdAt: guild.createdTimestamp,
          memberCount: guild.memberCount,
          roles: guild.roles.cache.map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions.bitfield.toString()
          })),
          channels: guild.channels.cache.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            parentId: c.parentId,
            position: c.position,
            permissionOverwrites: c.permissionOverwrites.cache.map(p => ({
              id: p.id,
              type: p.type,
              allow: p.allow.bitfield.toString(),
              deny: p.deny.bitfield.toString()
            }))
          }))
        };
        
        // Enviar el backup como un archivo JSON
        await interaction.reply({
          content: '📦 Backup del servidor creado',
          files: [{
            attachment: Buffer.from(JSON.stringify(backupData, null, 2)),
            name: `backup-${guild.name}-${Date.now()}.json`
          }]
        });
        break;
        
      case 'reiniciar':
        await interaction.reply('🔄 Reiniciando el bot...');
        
        // Guardar logs antes de reiniciar
        console.log('Bot reiniciado por:', interaction.user.tag);
        
        // Cerrar el bot
        setTimeout(() => {
          process.exit(0);
        }, 1000);
        break;
        
      case 'estado':
        const uptime = Math.floor(client.uptime / 1000);
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        const statusEmbed = new EmbedBuilder()
          .setTitle('🤖 Estado del Sistema')
          .addFields(
            { name: '⏱️ Tiempo activo', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '💾 Memoria usada', value: `${memoryMB} MB`, inline: true },
            { name: '📡 Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
            { name: '🏠 Servidores', value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Usuarios', value: `${client.users.cache.size}`, inline: true },
            { name: '📡 Versión de Discord.js', value: `14.x`, inline: true }
          )
          .setColor(0x3498db)
          .setFooter({ text: 'Brushy Staff | Sistema de Administración' });
        
        await interaction.reply({ embeds: [statusEmbed] });
        break;
    }
  }
});

// Manejar interacciones de botones
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  // Verificar si es staff
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar esta función.',
      ephemeral: true
    });
  }
  
  const { customId } = interaction;
  
  if (customId === 'panel_usuarios') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_info_usuario')
          .setLabel('📋 Ver Info de Usuario')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('accion_gestionar_roles')
          .setLabel('🎭 Gestionar Roles')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_kick_usuario')
          .setLabel('👢 Expulsar Usuario')
          .setStyle(ButtonStyle.Danger)
      );
    
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_ban_usuario')
          .setLabel('🔨 Banear Usuario')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('accion_advertencia')
          .setLabel('⚠️ Dar Advertencia')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_quitar_roles')
          .setLabel('🚫 Quitar Todos los Roles')
          .setStyle(ButtonStyle.Danger)
      );
    
    await interaction.update({
      content: 'Selecciona una acción de gestión de usuarios:',
      components: [row, row2]
    });
  } else if (customId === 'panel_servidor') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_stats_servidor')
          .setLabel('📊 Ver Estadísticas')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('accion_anuncio_servidor')
          .setLabel('📢 Crear Anuncio')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_encuesta_servidor')
          .setLabel('📋 Crear Encuesta')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_limpiar_mensajes')
          .setLabel('🧹 Limpiar Mensajes')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_volver_panel')
          .setLabel('🔙 Volver al Panel Principal')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.update({
      content: 'Selecciona una acción de gestión del servidor:',
      components: [row, row2]
    });
  } else if (customId === 'panel_tickets') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_resumen_tickets')
          .setLabel('📊 Ver Resumen')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('accion_cerrar_tickets')
          .setLabel('🔒 Cerrar Todos')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('accion_categoria_tickets')
          .setLabel('📁 Crear Categoría')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.update({
      content: 'Selecciona una acción de gestión de tickets:',
      components: [row]
    });
  } else if (customId === 'panel_sistema') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_backup_sistema')
          .setLabel('💾 Crear Backup')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_reiniciar_sistema')
          .setLabel('🔄 Reiniciar Bot')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('accion_estado_sistema')
          .setLabel('📈 Ver Estado')
          .setStyle(ButtonStyle.Primary)
      );
    
    await interaction.update({
      content: 'Selecciona una acción del sistema:',
      components: [row]
    });
  } else if (customId === 'panel_automatizacion') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_autoroles')
          .setLabel('🎭 Auto-Roles')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_bienvenida')
          .setLabel('👋 Mensaje de Bienvenida')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_despedida')
          .setLabel('👋 Mensaje de Despedida')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accion_antispam')
          .setLabel('🛡️ Anti-Spam')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_antienlaces')
          .setLabel('🔗 Anti-Enlaces')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('accion_volver_panel')
          .setLabel('🔙 Volver al Panel Principal')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.update({
      content: 'Selecciona una opción de automatización:',
      components: [row, row2]
    });
  } else if (customId === 'panel_logs') {
    // Mostrar logs recientes
    const logChannel = interaction.guild.channels.cache.get(CONFIG.logChannelId);
    
    if (!logChannel) {
      return interaction.update({
        content: '❌ No se ha configurado un canal de logs. Configúralo en el código del bot.',
        components: []
      });
    }
    
    try {
      const messages = await logChannel.messages.fetch({ limit: 10 });
      
      const embed = new EmbedBuilder()
        .setTitle('📜 Logs Recientes')
        .setDescription(messages.map(m => 
          `**${m.embeds[0]?.title || 'Sin título'}** - <t:${parseInt(m.createdTimestamp / 1000)}:R>\n${m.embeds[0]?.description || 'Sin descripción'}`
        ).join('\n\n'))
        .setColor(0x3498db);
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('accion_volver_panel')
            .setLabel('🔙 Volver al Panel Principal')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({
        embeds: [embed],
        components: [row]
      });
    } catch (error) {
      console.error('Error al obtener logs:', error);
      await interaction.update({
        content: '❌ Error al obtener los logs. Asegúrate de que el bot tenga permisos para leer el canal de logs.',
        components: []
      });
    }
  } else if (customId === 'accion_volver_panel') {
    // Volver al panel principal
    const mainRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_usuarios')
          .setLabel('👥 Gestión de Usuarios')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_servidor')
          .setLabel('📊 Gestión del Servidor')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_tickets')
          .setLabel('🎫 Gestión de Tickets')
          .setStyle(ButtonStyle.Success)
      );
    
    const secondRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_sistema')
          .setLabel('⚙️ Configuración del Sistema')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_automatizacion')
          .setLabel('🤖 Automatización')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_logs')
          .setLabel('📜 Ver Logs')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const embed = new EmbedBuilder()
      .setTitle('🎛️ Panel de Control - Brushy Staff')
      .setDescription('Selecciona una opción para administrar el servidor')
      .setColor(0x3498db)
      .setFooter({ text: 'Brushy Staff | Sistema de Administración' });
    
    await interaction.update({
      embeds: [embed],
      components: [mainRow, secondRow]
    });
  } else if (customId === 'confirmar_cerrar_tickets') {
    // Cerrar todos los tickets
    const ticketChannels = interaction.guild.channels.cache.filter(c => 
      c.name.includes('ticket-') && c.type === 0
    );
    
    let cerrados = 0;
    
    for (const [channelId, channel] of ticketChannels) {
      try {
        await channel.delete();
        cerrados++;
      } catch (error) {
        console.error(`Error al cerrar canal ${channel.name}:`, error);
      }
    }
    
    await interaction.update({
      content: `✅ Se han cerrado ${cerrados} tickets.`,
      components: []
    });
  } else if (customId === 'cancelar_cerrar_tickets') {
    await interaction.update({
      content: '❌ Acción cancelada.',
      components: []
    });
  } else if (customId.startsWith('accion_')) {
    // Manejar acciones de botones que requieren comandos
    const accion = customId.replace('accion_', '');
    
    switch (accion) {
      case 'info_usuario':
        await interaction.update({
          content: 'Por favor, usa el comando `/usuario accion:info usuario:@usuario` para ver la información de un usuario.',
          components: []
        });
        break;
        
      case 'gestionar_roles':
        await interaction.update({
          content: 'Por favor, usa el comando `/usuario accion:roles usuario:@usuario` para gestionar los roles de un usuario.',
          components: []
        });
        break;
        
      case 'kick_usuario':
        await interaction.update({
          content: 'Por favor, usa el comando `/usuario accion:kick usuario:@usuario razon:"tu razón"` para expulsar a un usuario.',
          components: []
        });
        break;
        
      case 'ban_usuario':
        await interaction.update({
          content: 'Por favor, usa el comando `/usuario accion:ban usuario:@usuario razon:"tu razón"` para banear a un usuario.',
          components: []
        });
        break;
        
      case 'advertencia':
        await interaction.update({
          content: 'Por favor, usa el comando `/usuario accion:advertencia usuario:@usuario razon:"tu razón"` para dar una advertencia a un usuario.',
          components: []
        });
        break;
        
      case 'quitar_roles':
        await interaction.update({
          content: 'Por favor, usa el comando `/usuario accion:quitar_roles usuario:@usuario` para quitar todos los roles de un usuario.',
          components: []
        });
        break;
        
      case 'stats_servidor':
        await interaction.update({
          content: 'Por favor, usa el comando `/servidor accion:stats` para ver las estadísticas del servidor.',
          components: []
        });
        break;
        
      case 'anuncio_servidor':
        await interaction.update({
          content: 'Por favor, usa el comando `/servidor accion:anuncio` para crear un anuncio.',
          components: []
        });
        break;
        
      case 'encuesta_servidor':
        await interaction.update({
          content: 'Por favor, usa el comando `/servidor accion:encuesta` para crear una encuesta.',
          components: []
        });
        break;
        
      case 'limpiar_mensajes':
        await interaction.update({
          content: 'Por favor, usa el comando `/servidor accion:limpiar cantidad:10` para limpiar mensajes.',
          components: []
        });
        break;
        
      case 'resumen_tickets':
        await interaction.update({
          content: 'Por favor, usa el comando `/tickets accion:resumen` para ver el resumen de tickets.',
          components: []
        });
        break;
        
      case 'cerrar_tickets':
        await interaction.update({
          content: 'Por favor, usa el comando `/tickets accion:cerrar_todos` para cerrar todos los tickets.',
          components: []
        });
        break;
        
      case 'categoria_tickets':
        await interaction.update({
          content: 'Por favor, usa el comando `/tickets accion:crear_categoria` para crear una categoría para tickets.',
          components: []
        });
        break;
        
      case 'backup_sistema':
        await interaction.update({
          content: 'Por favor, usa el comando `/sistema accion:backup` para crear un backup del servidor.',
          components: []
        });
        break;
        
      case 'reiniciar_sistema':
        await interaction.update({
          content: 'Por favor, usa el comando `/sistema accion:reiniciar` para reiniciar el bot.',
          components: []
        });
        break;
        
      case 'estado_sistema':
        await interaction.update({
          content: 'Por favor, usa el comando `/sistema accion:estado` para ver el estado del sistema.',
          components: []
        });
        break;
        
      case 'autoroles':
      case 'bienvenida':
      case 'despedida':
      case 'antispam':
      case 'antienlaces':
        await interaction.update({
          content: `Función de automatización "${accion}" en desarrollo. Próximamente estará disponible.`,
          components: []
        });
        break;
    }
  }
});

// Manejar interacciones de menús de selección
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isSelectMenu()) return;
  
  // Verificar si es staff
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar esta función.',
      ephemeral: true
    });
  }
  
  const { customId, values } = interaction;
  
  if (customId.startsWith('roles_')) {
    const userId = customId.split('_')[1];
    const member = await interaction.guild.members.fetch(userId);
    
    // Quitar todos los roles seleccionados
    for (const roleId of values) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      } else {
        await member.roles.add(roleId);
      }
    }
    
    await interaction.update({
      content: `✅ Se han actualizado los roles de ${member.user.tag}.`,
      components: []
    });
    
    await logAction(interaction.guild, 'Roles Actualizados', interaction.user, member.user, 'Actualización de roles desde el panel');
  }
});

// Manejar envíos de modales
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  
  // Verificar si es staff
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar esta función.',
      ephemeral: true
    });
  }
  
  const { customId } = interaction;
  
  if (customId === 'anuncio_modal') {
    const titulo = interaction.fields.getTextInputValue('anuncio_titulo');
    const mensaje = interaction.fields.getTextInputValue('anuncio_mensaje');
    const canalId = interaction.fields.getTextInputValue('anuncio_canal');
    
    const canal = canalId ? 
      await interaction.guild.channels.fetch(canalId) : 
      interaction.channel;
    
    if (!canal) {
      return interaction.reply({
        content: '❌ No se encontró el canal especificado.',
        ephemeral: true
      });
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`📢 ${titulo}`)
      .setDescription(mensaje)
      .setColor(0x3498db)
      .setFooter({ text: `Anuncio por ${interaction.user.tag}` });
    
    await canal.send({ embeds: [embed] });
    await interaction.reply({
      content: `✅ Anuncio enviado a ${canal.toString()}`,
      ephemeral: true
    });
    
    await logAction(interaction.guild, 'Anuncio Enviado', interaction.user, canal, titulo);
  } else if (customId === 'encuesta_modal') {
    const pregunta = interaction.fields.getTextInputValue('encuesta_pregunta');
    const opcionesTexto = interaction.fields.getTextInputValue('encuesta_opciones');
    const duracionTexto = interaction.fields.getTextInputValue('encuesta_duracion');
    
    const opciones = opcionesTexto.split(',').map(o => o.trim()).slice(0, 10);
    const duracion = duracionTexto ? parseInt(duracionTexto) : null;
    
    if (opciones.length < 2) {
      return interaction.reply({
        content: '❌ Debes proporcionar al menos 2 opciones para la encuesta.',
        ephemeral: true
      });
    }
    
    // Crear embed para la encuesta
    const embed = new EmbedBuilder()
      .setTitle(`📋 ${pregunta}`)
      .setDescription(opciones.map((o, i) => `${i + 1}. ${o}`).join('\n'))
      .setColor(0x3498db)
      .setFooter({ text: `Encuesta por ${interaction.user.tag}` });
    
    // Enviar la encuesta
    const message = await interaction.channel.send({ embeds: [embed] });
    
    // Añadir reacciones para votar
    for (let i = 0; i < opciones.length; i++) {
      await message.react(`${i + 1}\u20e3`);
    }
    
    // Si hay duración, programar el cierre
    if (duracion && duracion > 0) {
      setTimeout(async () => {
        try {
          const fetchedMessage = await interaction.channel.messages.fetch(message.id);
          const reactions = fetchedMessage.reactions.cache;
          
          const resultados = [];
          
          for (let i = 0; i < opciones.length; i++) {
            const reaction = reactions.get(`${i + 1}\u20e3`);
            const count = reaction ? reaction.count - 1 : 0; // Restar 1 para excluir la reacción del bot
            resultados.push(`${opciones[i]}: ${count} votos`);
          }
          
          const resultEmbed = new EmbedBuilder()
            .setTitle(`📊 Resultados de la encuesta: ${pregunta}`)
            .setDescription(resultados.join('\n'))
            .setColor(0x3498db)
            .setFooter({ text: `Encuesta cerrada` });
          
          await interaction.channel.send({ embeds: [resultEmbed] });
        } catch (error) {
          console.error('Error al cerrar la encuesta:', error);
        }
      }, duracion * 60 * 1000);
    }
    
    await interaction.reply({
      content: '✅ Encuesta creada correctamente.',
      ephemeral: true
    });
    
    await logAction(interaction.guild, 'Encuesta Creada', interaction.user, null, pregunta);
  }
});

// Eventos de bienvenida y despedida
client.on('guildMemberAdd', async (member) => {
  try {
    const welcomeChannel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (!welcomeChannel) return;
    
    const embed = new EmbedBuilder()
      .setTitle('👋 ¡Bienvenido al servidor!')
      .setDescription(`¡Hola ${member.user}! Bienvenido a **${member.guild.name}**.`)
      .addFields(
        { name: '📋 Reglas', value: `Por favor, lee las reglas en <#${CONFIG.rulesChannelId}>`, inline: false },
        { name: '🎫 Soporte', value: 'Si necesitas ayuda, abre un ticket en el canal correspondiente.', inline: false }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x00FF00)
      .setFooter({ text: `ID: ${member.user.id}` });
    
    await welcomeChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error al enviar mensaje de bienvenida:', error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const welcomeChannel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (!welcomeChannel) return;
    
    const embed = new EmbedBuilder()
      .setTitle('👋 Un miembro se ha ido')
      .setDescription(`**${member.user.tag}** ha abandonado el servidor.`)
      .addFields(
        { name: '📅 Fecha de ingreso', value: `<t:${parseInt(member.joinedTimestamp / 1000)}:F>`, inline: true },
        { name: '📅 Fecha de salida', value: `<t:${parseInt(Date.now() / 1000)}:F>`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xFF0000)
      .setFooter({ text: `ID: ${member.user.id}` });
    
    await welcomeChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error al enviar mensaje de despedida:', error);
  }
});

// Iniciar el bot
client.login(process.env.TOKEN);

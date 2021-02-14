import { Message, VoiceState } from "discord.js";
import { get, request } from "http";
import { Config } from "./types";


// Command for both bans and kicks
export function hardPunish(mode: 'BAN' | 'KICK', message: Message, args: Array<String>) {
  args.shift()

  if(!message.member?.hasPermission('KICK_MEMBERS') && mode == 'KICK') {
    message.channel.send('You have no permissions to do that')
    return
  }
  
  if(!message.member?.hasPermission('BAN_MEMBERS') && mode == 'BAN') {
    message.channel.send('You have no permissions to do that')
    return
  }

  let mentionMember = message.mentions.members?.first()

  if(!mentionMember) {
    return message.channel.send(`Mention member which you want to ${mode == 'BAN' ? 'ban' : 'kick'}`);
  }


  let authorHighestRole = message.member?.roles.highest.position
  let mentionHighestRole = mentionMember.roles.highest.position

  if (!authorHighestRole) return


  if(mentionHighestRole >= authorHighestRole) {
    message.channel.send(`You can\'t ${mode == 'BAN' ? 'ban' : 'kick'} members with equal or higher position`)
    return
  }

  if(!mentionMember.manageable) {
    message.channel.send(`I do not have the required permissions ${mode == 'BAN' ? 'ban' : 'kick'} this user`)
    return
  }

  let punishReason = args[0] ? args.join(' ') : 'No reason provided'

  mentionMember.send(`You were ${mode == 'BAN' ? 'banned' : 'kicked'} from **${message.guild?.name}**\nReason: \`${punishReason}\``).then(() => {
    
    if (mode == 'KICK') {
      mentionMember?.kick(punishReason)
      .then(() => {
        message.channel?.send(`**${mentionMember?.user.tag}** was kicked by ${message.member?.user.tag}\nReason: \`${punishReason}\``)
      }).catch(console.error)
    }
    else {
      mentionMember?.ban({
        reason: punishReason
      })
      .then(() => {
        message.channel?.send(`**${mentionMember?.user.tag}** was banned by ${message.member?.user.tag}\nReason: \`${punishReason}\``)
      }).catch(console.error)
    }
  })
}

// Text Filters

export function noGif(message: Message) {
  if (!message) return

  let containsGif = message.content.match('https://tenor.com/view/sailor-moon-suit-old-man-peace-sign-sailor-scout-anime-gif-14298094')
  if (containsGif) {
    message.channel.send(`${message.author.tag} sent the no no gif in chat`)
    message.delete().catch(console.error)
  }
}


// On voiceStateUpdate
let voiceGenName = 'Create'
let voiceGeneratedName = 'Room'
let currentVoiceCount = 0
let voiceRoomLimit = 5
let voiceRoomNamingOffset = 0

export function onVoiceStateUpdate(oldMember: VoiceState, newMember: VoiceState) {
  let oldMemberChannelName = oldMember.channel?.name.trim()
  let newMemberChannelName = newMember.channel?.name.trim()

  let newMemberCategory = newMember.channel?.parent


  if (oldMemberChannelName && oldMemberChannelName?.search(voiceGeneratedName) > -1 ) {
    if (oldMember.channel && oldMember.channel.members.array().length == 0) {
      oldMember.channel.delete().catch(console.error)
      currentVoiceCount -= 1
      resortVoiceChannels(oldMember, newMember)
      return
    }
    
  }

  if (newMemberChannelName && newMemberChannelName?.search(voiceGenName) > -1) {

    oldMember.guild.channels.create(`🔊 ${voiceGeneratedName} ${currentVoiceCount += 1}`, { type: 'voice', userLimit: voiceRoomLimit }).then(channel => {
      if (newMemberCategory)
        channel.setParent(newMemberCategory).catch(console.error)

      newMember.setChannel(channel).catch(console.error)
      
    }).catch(console.error)

    resortVoiceChannels(oldMember, newMember)
  }

} 



function resortVoiceChannels(oldMember: VoiceState, newMember: VoiceState) {
  let oldMemberCategory = oldMember.channel?.parent
  let newMemberCategory = newMember.channel?.parent


  let newMemberCategoryRooms = newMemberCategory?.children.filter(c => {
    return c.type == 'voice' && c.name.search(voiceGeneratedName) > -1 
  })
  let oldMemberCategoryRooms = oldMemberCategory?.children.filter(c => {
    return c.type == 'voice' && c.name.search(voiceGeneratedName) > -1 
  })

  if (newMemberCategory && newMemberCategoryRooms) {
    newMemberCategoryRooms.array().forEach(c => {
      c.setName(`🔊 Room ${c.position - voiceRoomNamingOffset}`).catch(console.error)
    })
  }

  if (oldMemberCategory && oldMemberCategoryRooms) {
    oldMemberCategoryRooms.array().forEach(c => {
      c.setName(`🔊 Room ${c.position - voiceRoomNamingOffset}`).catch(console.error)
    })
  }
}
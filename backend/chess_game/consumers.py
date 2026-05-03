import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'game_{self.room_code}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_joined',
                'message': 'A player joined the game'
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_left',
                'message': 'A player left the game'
            }
        )
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'move':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_move',
                    'move': data.get('move'),
                    'fen': data.get('fen'),
                    'pgn': data.get('pgn'),
                }
            )
        elif message_type == 'game_over':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_over',
                    'result': data.get('result'),
                }
            )
        elif message_type == 'draw_offer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'draw_offer',
                    'from': data.get('from'),
                }
            )

    async def game_move(self, event):
        await self.send(text_data=json.dumps({
            'type': 'move',
            'move': event['move'],
            'fen': event['fen'],
            'pgn': event['pgn'],
        }))

    async def player_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_joined',
            'message': event['message']
        }))

    async def player_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_left',
            'message': event['message']
        }))

    async def game_over(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_over',
            'result': event['result']
        }))

    async def draw_offer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'draw_offer',
            'from': event['from']
        }))
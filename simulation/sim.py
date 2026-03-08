import asyncio
import json
import os
import websockets

# ─── Constants ────────────────────────────────────────────────────────────────

MAX_SPEED = 42.0
MAX_RPM   = 5200
IDLE_RPM  = 800

# ─── Per-connection simulation ────────────────────────────────────────────────

def make_state():
    return {'throttle': 0, 'speed': 0.0, 'rpm': IDLE_RPM}

def update_state(state):
    t = state['throttle'] / 100.0
    state['speed'] = round(pow(t, 1.15) * MAX_SPEED, 1)
    state['rpm']   = round(IDLE_RPM + t * (MAX_RPM - IDLE_RPM))

# ─── WebSocket handler ────────────────────────────────────────────────────────

async def send_loop(websocket, state):
    while True:
        await websocket.send(json.dumps(state))
        await asyncio.sleep(0.1)

async def handler(websocket):
    state = make_state()
    print(f'Client connected: {websocket.remote_address}')
    send_task = asyncio.create_task(send_loop(websocket, state))
    try:
        async for message in websocket:
            data = json.loads(message)
            if 'throttle' in data:
                state['throttle'] = max(0, min(100, int(data['throttle'])))
                update_state(state)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        send_task.cancel()
        print('Client disconnected')

# ─── Entry point ──────────────────────────────────────────────────────────────

async def main():
    port = int(os.environ.get('PORT', 8765))
    print(f'Surfware sim server starting on 0.0.0.0:{port}')
    async with websockets.serve(handler, '0.0.0.0', port):
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())

import asyncio
import json
import os
import random
import websockets
from http import HTTPStatus

# ─── Constants ────────────────────────────────────────────────────────────────

MAX_SPEED = 42.0
MAX_RPM   = 5200
IDLE_RPM  = 800

# Oil pressure: ~25 PSI at idle, scales up to ~60 PSI at full RPM
OIL_IDLE_PSI = 25
OIL_MAX_PSI  = 60

# Engine temp: ~170F at idle (no airflow), cools toward ~145F at speed
ETEMP_IDLE_TARGET = 170
ETEMP_SPEED_TARGET = 145
ETEMP_COLD_START   = 140

# ─── Per-connection simulation ────────────────────────────────────────────────

# Overheat threshold for triggering diagnostic code
ETEMP_OVERHEAT_CODE = 210
ETEMP_OVERHEAT_MAX  = 220

# Diagnostic codes
DTC_CODES = {
    'P0217': {
        'desc': 'Engine Coolant Over Temperature',
        'severity': 'Do not operate. Take to dealer immediately.',
        'severity_class': 'critical',
    },
    'P0218': {
        'desc': 'Transmission Fluid Over Temperature',
        'severity': 'Reduce speed. Service soon.',
        'severity_class': 'warning',
    },
    'P0117': {
        'desc': 'Engine Coolant Temp Sensor Low',
        'severity': 'Have system checked.',
        'severity_class': 'info',
    },
}


def make_state():
    return {
        'throttle':     0,
        'speed':        0.0,
        'rpm':          IDLE_RPM,
        'oil_psi':      OIL_IDLE_PSI,
        'etemp':        ETEMP_COLD_START,
        'cruise_on':    False,
        'cruise_speed': 0.0,
        'codes':        [],
        'overheat_sim': False,
        'overheat_start_temp': None,
    }

def update_state(state):
    t = state['throttle'] / 100.0

    # Speed & RPM (always computed)
    raw_speed = round(pow(t, 1.15) * MAX_SPEED, 1)
    raw_rpm   = round(IDLE_RPM + t * (MAX_RPM - IDLE_RPM))
    if state['cruise_on'] and state['cruise_speed'] > 0 and raw_speed > state['cruise_speed']:
        state['speed'] = state['cruise_speed']
        capped_t = pow(state['cruise_speed'] / MAX_SPEED, 1.0 / 1.15)
        state['rpm'] = round(IDLE_RPM + capped_t * (MAX_RPM - IDLE_RPM))
    else:
        state['speed'] = raw_speed
        state['rpm'] = raw_rpm

    # Oil pressure tracks RPM
    rpm_ratio = (state['rpm'] - IDLE_RPM) / (MAX_RPM - IDLE_RPM)
    target_oil = OIL_IDLE_PSI + rpm_ratio * (OIL_MAX_PSI - OIL_IDLE_PSI)
    state['oil_psi'] = round(target_oil + random.uniform(-0.8, 0.8))

    # Engine temp: overheat sim or normal
    if state.get('overheat_sim'):
        start = state.get('overheat_start_temp') or state['etemp']
        ticks_needed = 200  # ~20 sec at 0.1s/tick
        rise_per_tick = (ETEMP_OVERHEAT_MAX - start) / ticks_needed
        state['etemp'] = min(ETEMP_OVERHEAT_MAX, state['etemp'] + rise_per_tick)
        state['etemp'] = round(state['etemp'], 1)
        if state['etemp'] >= ETEMP_OVERHEAT_MAX:
            state['overheat_sim'] = False

        if state['etemp'] > ETEMP_OVERHEAT_CODE:
            code_id = 'P0217'
            if not any(c.get('code') == code_id for c in state['codes']):
                state['codes'] = [c for c in state['codes'] if c.get('code') != code_id]
                state['codes'].append({
                    'code': code_id,
                    'desc': DTC_CODES[code_id]['desc'],
                    'severity': DTC_CODES[code_id]['severity'],
                    'severity_class': DTC_CODES[code_id]['severity_class'],
                })
    else:
        target_temp = ETEMP_IDLE_TARGET - rpm_ratio * (ETEMP_IDLE_TARGET - ETEMP_SPEED_TARGET)
        drift = (target_temp - state['etemp']) * 0.02
        state['etemp'] = round(state['etemp'] + drift + random.uniform(-0.3, 0.3), 1)

# ─── WebSocket handler ────────────────────────────────────────────────────────

async def send_loop(websocket, state):
    while True:
        update_state(state)
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
            if 'cruise_on' in data:
                state['cruise_on'] = bool(data['cruise_on'])
            if 'cruise_speed' in data:
                state['cruise_speed'] = float(data['cruise_speed'])
            if data.get('start_error_sim') == 'overheat':
                state['overheat_sim'] = True
                state['overheat_start_temp'] = state['etemp']
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        send_task.cancel()
        print('Client disconnected')

# ─── Entry point ──────────────────────────────────────────────────────────────

async def health_check(path, request_headers):
    if path == '/health':
        return HTTPStatus.OK, [], b'ok'

async def main():
    port = int(os.environ.get('PORT', 8765))
    print(f'Surfware sim server starting on 0.0.0.0:{port}')
    async with websockets.serve(handler, '0.0.0.0', port, process_request=health_check):
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())

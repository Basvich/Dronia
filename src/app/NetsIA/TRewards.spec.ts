import { TDrone3D } from '../Objects/Drone3D';
import { TReward, TReward3D } from './TRewards';

describe('Recompensas', () => {
  it('mantiene los tramos y la proyección de velocidad de 1D', () => {
    const drone = new TDrone3D(0, 6);
    const reward = new TReward();
    expect(reward.InstanReward(drone)).toBe(10);
    drone.Position.y = 8;
    expect(reward.InstanReward(drone)).toBe(5);
    drone.Position.y = 12;
    expect(reward.InstanReward(drone)).toBeCloseTo(0);
    drone.Position.y = 13;
    expect(reward.InstanReward(drone)).toBe(-2);
    drone.Position.y = 6;
    drone.Velocity.y = 2;
    expect(reward.InstanReward(drone)).toBeCloseTo(0);
  });

  it('usa distancia Manhattan y proyecta la velocidad en 3D', () => {
    const drone = new TDrone3D(0, 6);
    const reward = new TReward3D();
    drone.Position.set(1, 7, 0);
    expect(reward.InstanReward(drone)).toBe(5);
    drone.Velocity.set(1, 0, 0);
    expect(reward.InstanReward(drone)).toBe(2.5);
  });

  it('solo concede éxito dentro de los límites de posición y velocidad', () => {
    const drone = new TDrone3D(0, 6);
    const rewards = [new TReward(), new TReward3D()];
    for (const reward of rewards) {
      expect(reward.IsDone(drone)).toBeGreaterThan(0);
      drone.Velocity.y = 0.31;
      expect(reward.IsDone(drone)).toBe(0);
      drone.Velocity.y = 0;
      drone.Position.y = 6.21;
      expect(reward.IsDone(drone)).toBe(0);
      drone.Position.y = 6;
    }
  });

  it('la recompensa PD penaliza por separado error y velocidad', () => {
    const drone = new TDrone3D(0, 9);
    const reward = new TReward('pd');
    drone.Velocity.y = -1;
    expect(reward.InstanReward(drone)).toBe(0);
    drone.Position.y = 6;
    drone.Velocity.y = 0;
    expect(reward.InstanReward(drone)).toBe(10);
  });

  it('la integral PID se satura, se reduce al invertir el error y se reinicia', () => {
    const drone = new TDrone3D(0, 4);
    const reward = new TReward('pid');
    expect(reward.InstanReward(drone, 0.1)).toBeCloseTo(4.98);
    for (let i = 0; i < 100; i++) reward.InstanReward(drone, 0.1);
    expect(reward.InstanReward(drone, 0.1)).toBeCloseTo(4);
    drone.Position.y = 8;
    expect(reward.InstanReward(drone, 0.1)).toBeCloseTo(4.02);
    reward.reset();
    expect(reward.InstanReward(drone, 0.1)).toBeCloseTo(4.98);
    reward.targetY = 8;
    expect(reward.InstanReward(drone, 0.1)).toBe(10);
    expect(() => reward.InstanReward(drone, 0)).toThrow();
    expect(() => reward.InstanReward(drone)).toThrow();
  });
});

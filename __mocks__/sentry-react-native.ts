export const init = jest.fn();
export const nativeCrash = jest.fn();
export const wrap = (component: unknown) => component;
export const getGlobalScope = () => ({ setUser: jest.fn() });

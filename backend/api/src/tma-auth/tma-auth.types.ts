export type TmaJwtPayload = {
  sub: string;
  telegramId: string;
  scope: 'tma';
};

export type TmaAuthenticatedUser = {
  userId: string;
  telegramId: string;
};

export type TmaRequest = {
  headers: {
    authorization?: string;
  };
  tmaUser?: TmaAuthenticatedUser;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  DisplaySettings: undefined;
  ReceiptDetail: { saleId: number };
};

export type SellStackParamList = {
  SellHome: undefined;
};

export type ProductsStackParamList = {
  ProductList: undefined;
  ProductForm: { productId?: number };
};

export type HistoryStackParamList = {
  HistoryHome: undefined;
};

export type RootTabParamList = {
  Sell: undefined;
  Products: undefined;
  History: undefined;
};

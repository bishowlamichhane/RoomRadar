import json, numpy as np, pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

RNG = np.random.default_rng(42)
CITIES = {"Kathmandu": 1.00, "Lalitpur": 0.95, "Bhaktapur": 0.88}
AREAS = {
  "Baneshwor": ("Kathmandu", 1.15, 27.6939, 85.3420),"Koteshwor": ("Kathmandu", 1.05, 27.6776, 85.3497),
  "Kalanki": ("Kathmandu", 0.95, 27.6934, 85.2810),"Chabahil": ("Kathmandu", 1.02, 27.7172, 85.3480),
  "Baluwatar": ("Kathmandu", 1.22, 27.7280, 85.3300),"Maharajgunj": ("Kathmandu", 1.20, 27.7360, 85.3320),
  "Kirtipur": ("Kathmandu", 0.90, 27.6790, 85.2770),"Balaju": ("Kathmandu", 0.98, 27.7290, 85.3010),
  "Gongabu": ("Kathmandu", 1.00, 27.7350, 85.3160),"Samakhusi": ("Kathmandu", 1.03, 27.7380, 85.3230),
  "Naxal": ("Kathmandu", 1.18, 27.7130, 85.3270),"Thamel": ("Kathmandu", 1.20, 27.7150, 85.3110),
  "Kupondole": ("Lalitpur", 1.15, 27.6870, 85.3170),"Jhamsikhel": ("Lalitpur", 1.20, 27.6770, 85.3090),
  "Pulchowk": ("Lalitpur", 1.12, 27.6790, 85.3170),"Satdobato": ("Lalitpur", 0.98, 27.6580, 85.3260),
  "Lagankhel": ("Lalitpur", 1.02, 27.6670, 85.3230),"Imadol": ("Lalitpur", 0.92, 27.6610, 85.3410),
  "Ekantakuna": ("Lalitpur", 1.00, 27.6640, 85.3100),"Sanepa": ("Lalitpur", 1.18, 27.6820, 85.3060),
  "Bhaisepati": ("Lalitpur", 0.95, 27.6450, 85.3010),"Suryabinayak": ("Bhaktapur", 0.95, 27.6660, 85.4340),
  "Kamalbinayak": ("Bhaktapur", 0.98, 27.6790, 85.4360),"Sallaghari": ("Bhaktapur", 0.96, 27.6720, 85.4470),
  "Dudhpati": ("Bhaktapur", 0.94, 27.6720, 85.4270),"Katunje": ("Bhaktapur", 0.90, 27.6560, 85.4290),
  "Sipadol": ("Bhaktapur", 0.88, 27.6540, 85.4560),"Thimi": ("Bhaktapur", 0.93, 27.6810, 85.3860),
  "Gatthaghar": ("Bhaktapur", 0.97, 27.6740, 85.3760),
}
ROOMTYPES = {"Single Room": (7000, (120, 260)),"1BHK": (14000, (300, 550)),"2BHK": (23000, (550, 900)),
  "Flat": (36000, (700, 1400)),"Hostel": (9000, (100, 200))}
AMENITIES = ["waterSupply","parking","attachedBathroom","wifiReady","kitchen","balcony"]

def make_dataset(n=800):
    rows = []; areas = list(AREAS.keys()); rts = list(ROOMTYPES.keys())
    for _ in range(n):
        area = RNG.choice(areas); city, desir, lat, lng = AREAS[area]
        rt = RNG.choice(rts); base, (smin, smax) = ROOMTYPES[rt]
        size = float(RNG.integers(smin, smax))
        bedrooms = {"Single Room":1,"Hostel":1,"1BHK":1,"2BHK":2,"Flat":int(RNG.integers(2,4))}[rt]
        bathrooms = 1 if rt in ("Single Room","Hostel","1BHK") else int(RNG.integers(1,3))
        floor = int(RNG.integers(0,5)); furnished = int(RNG.random() < 0.4)
        am = {a: int(RNG.random() < p) for a,p in zip(AMENITIES,[0.9,0.4,0.6,0.7,0.6,0.4])}
        rent = base * CITIES[city] * desir
        rent *= (0.75 + size/(sum(ROOMTYPES[rt][1])/2) * 0.5)
        rent += 1500*am["parking"] + 1200*am["attachedBathroom"] + 800*am["wifiReady"] + 1500*furnished
        rent += 900*(bathrooms-1) + 1000*(bedrooms-1)
        rent *= (1 + RNG.normal(0, 0.06)); rent = max(4000, round(rent/100)*100)
        rows.append({"city":city,"area":area,"roomType":rt,"sizeSqft":size,"floor":floor,
                     "bedrooms":bedrooms,"bathrooms":bathrooms,"furnished":furnished,**am,
                     "latitude":lat+RNG.normal(0,0.004),"longitude":lng+RNG.normal(0,0.004),"rent":rent})
    return pd.DataFrame(rows)

df = make_dataset(800); df.to_csv("dataset.csv", index=False)
def onehot(df):
    X = pd.DataFrame()
    X["sizeSqft"]=df["sizeSqft"]; X["floor"]=df["floor"]; X["bedrooms"]=df["bedrooms"]; X["bathrooms"]=df["bathrooms"]
    for b in ["furnished"]+AMENITIES: X[b]=df[b]
    X["city_Lalitpur"]=(df["city"]=="Lalitpur").astype(int); X["city_Bhaktapur"]=(df["city"]=="Bhaktapur").astype(int)
    for rt in ["1BHK","2BHK","Flat","Hostel"]: X[f"roomType_{rt}"]=(df["roomType"]==rt).astype(int)
    return X
y = df["rent"].values; X_base = onehot(df)
X_tr, X_te, y_tr, y_te, df_tr, df_te = train_test_split(X_base, y, df, test_size=0.2, random_state=42)
global_mean = y_tr.mean()
area_index = (df_tr.assign(rent=y_tr).groupby("area")["rent"].mean() / global_mean).to_dict()
def add_index(X, dframe):
    X = X.copy(); X["area_price_index"] = dframe["area"].map(lambda a: area_index.get(a,1.0)).values; return X
X_tr = add_index(X_tr, df_tr); X_te = add_index(X_te, df_te)
FEATURES = list(X_tr.columns)
def evaluate(model):
    model.fit(X_tr, y_tr); p = model.predict(X_te)
    return (mean_absolute_error(y_te,p), mean_squared_error(y_te,p)**0.5, r2_score(y_te,p), p, model)
lin_mae, lin_rmse, lin_r2, lin_p, lin_model = evaluate(LinearRegression())
rf_mae, rf_rmse, rf_r2, rf_p, rf_model = evaluate(RandomForestRegressor(n_estimators=200, random_state=42))
gb_mae, gb_rmse, gb_r2, gb_p, gb_model = evaluate(GradientBoostingRegressor(random_state=42))
comparison = [
  {"model":"Linear Regression","mae":round(lin_mae),"rmse":round(lin_rmse),"r2":round(lin_r2,3)},
  {"model":"Random Forest","mae":round(rf_mae),"rmse":round(rf_rmse),"r2":round(rf_r2,3)},
  {"model":"Gradient Boosting","mae":round(gb_mae),"rmse":round(gb_rmse),"r2":round(gb_r2,3)}]
importances = sorted([{"feature":f,"importance":round(float(i),4)} for f,i in zip(FEATURES, rf_model.feature_importances_)], key=lambda d:-d["importance"])
model_json = {"type":"linear","features":FEATURES,"intercept":float(lin_model.intercept_),
  "coefficients":{f:float(c) for f,c in zip(FEATURES, lin_model.coef_)},
  "areaIndex":{k:round(float(v),4) for k,v in area_index.items()},"defaultAreaIndex":1.0,
  "cityBaseline":"Kathmandu","roomTypeBaseline":"Single Room","amenityKeys":AMENITIES}
json.dump(model_json, open("model.json","w"), indent=2)
metrics_json = {"comparison":comparison,"bestServed":"Linear served; ensembles reported",
  "featureImportance":importances,
  "actualVsPredicted":[{"actual":float(a),"predicted":float(p)} for a,p in zip(y_te[:120], lin_p[:120])],
  "n_train":int(len(y_tr)),"n_test":int(len(y_te))}
json.dump(metrics_json, open("metrics.json","w"), indent=2)
print("COMPARISON:", json.dumps(comparison))
print("TOP FEATURES:", json.dumps(importances[:5]))

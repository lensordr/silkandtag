from app.db import Base, engine, SessionLocal
from app import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.Product).count() == 0:
    sample = [
        dict(title="Blazer de lana Zara", brand="Zara", category="Chaquetas", size="M", color="Negro",
             condition="Como nuevo", price=28.0, original_price=69.0,
             description="Blazer entallado de lana, forro interior, una sola vez puesto."),
        dict(title="Vestido midi Mango", brand="Mango", category="Vestidos", size="S", color="Verde",
             condition="Muy bueno", price=19.0, original_price=45.0,
             description="Vestido midi de punto, ideal para entretiempo."),
        dict(title="Camisa de seda Massimo Dutti", brand="Massimo Dutti", category="Camisas", size="M", color="Blanco",
             condition="Muy bueno", price=22.0, original_price=59.0,
             description="Camisa 100% seda, corte clasico, sin manchas ni roturas."),
        dict(title="Vaqueros rectos Levi's 501", brand="Levi's", category="Pantalones", size="40", color="Azul",
             condition="Bueno", price=25.0, original_price=90.0,
             description="Levi's 501 originales, ligero desgaste natural en los bajos."),
        dict(title="Botines de piel Panama Jack", brand="Panama Jack", category="Zapatos", size="39", color="Marron",
             condition="Muy bueno", price=32.0, original_price=120.0,
             description="Botines de piel autentica, suela en buen estado."),
        dict(title="Bolso bandolera Parfois", brand="Parfois", category="Bolsos", size="Unica", color="Camel",
             condition="Como nuevo", price=15.0, original_price=35.0,
             description="Bolso bandolera pequeno, cierre de cremallera, interior impecable."),
    ]
    for s in sample:
        db.add(models.Product(**s, status="available"))
    db.commit()
    print(f"Seeded {len(sample)} products")
else:
    print("Products already exist, skipping seed")

db.close()

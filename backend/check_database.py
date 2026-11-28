from db import db

print("\n=== CYBERGUARD DATABASE ===")
print("Database:", db.name)

collections = db.list_collection_names()

print("\nCollections disponibles :", collections)

for name in collections:
    collection = db[name]

    print(f"\n--- Collection : {name} ---")
    print("Nombre de documents :", collection.count_documents({}))

    document = collection.find_one()

    if document:
        print("Champs disponibles :", list(document.keys()))
    else:
        print("Collection vide")
"""Isolated integration check for household seats, roles, saved recipes and weekly publishing."""
from http.cookies import SimpleCookie
from pathlib import Path
from tempfile import TemporaryDirectory
import main
from fastapi import HTTPException, Response


def new_user(email, name, household=None, code=None):
    response = Response()
    result = main.register(main.RegisterRequest(email=email, password="correct horse battery staple", display_name=name, household_name=household, invite_code=code), response)
    cookie = SimpleCookie(); cookie.load(response.headers["set-cookie"])
    token = cookie[main.SESSION_COOKIE].value
    assert main.session_user(token)["id"] == result["user"]["id"]
    return result["user"], token


def rejected(fn, status):
    try:
        fn()
    except HTTPException as error:
        assert error.status_code == status, (error.status_code, status)
    else:
        raise AssertionError(f"Expected HTTP {status}")


with TemporaryDirectory() as folder:
    main.DB = Path(folder) / "test.db"
    with main.connection() as db: main.initialize(db)
    owner, owner_token = new_user("owner@example.com", "Owner", "Test family")
    assert owner["role"] == "owner" and owner["is_site_admin"]
    assert main.household_members(owner)["max_accounts"] == 3
    code1 = main.create_invitation(main.InviteRequest(email="one@example.com"), owner)["invite_code"]
    code2 = main.create_invitation(main.InviteRequest(email="two@example.com"), owner)["invite_code"]
    rejected(lambda: main.create_invitation(main.InviteRequest(email="three@example.com"), owner), 409)
    first, first_token = new_user("one@example.com", "First", code=code1)
    second, _ = new_user("two@example.com", "Second", code=code2)
    assert len(main.household_members(owner)["members"]) == 3
    rejected(lambda: main.owner_user(first), 403)
    rejected(lambda: new_user("uninvited@example.com", "No", code="wrong"), 400)
    assert main.household_state(owner)["state"] is None
    main.save_household_state(main.HouseholdStateRequest(state={"plan": {"id": "plan-one"}}), first)
    assert main.household_state(owner)["state"]["plan"]["id"] == "plan-one"
    main.save_recipe(main.SaveRecipe(recipe_slug="sarciadong-isda"), first)
    assert len(main.list_saved(first)["items"]) == 1
    assert len(main.list_saved(second)["items"]) == 0
    week = main.week_monday()
    published = main.publish_featured_week(week, main.FeaturedWeekRequest(slugs=["chicken-adobo", "tortang-talong", "sinigang-na-baboy", "sarciadong-isda", "ginisang-monggo", "tinolang-manok", "bicol-express"]), owner)
    assert len(published["days"]) == 7 and published["days"][3]["recipe"]["image"]
    rejected(lambda: main.publish_featured_week(week, main.FeaturedWeekRequest(slugs=["chicken-adobo"] * 7), owner), 400)
    ingredient = main.list_ingredients()["items"][0]
    assert all(item["price_php"] % 5 == 0 for item in main.list_ingredients()["items"])
    assert main.round_price(61) == 60 and main.round_price(63) == 65
    updated = main.update_ingredient_price(ingredient["id"], main.PriceUpdate(price_php=ingredient["price_php"] + 3, price_source="Test market survey"), owner)
    assert updated["price_php"] == ingredient["price_php"] + 5
    assert next(item for item in main.list_ingredients()["items"] if item["id"] == ingredient["id"])["price_php"] == updated["price_php"]
    dish = main.recipe("sarciadong-isda")
    edited = main.update_recipe(dish["slug"], main.RecipeUpdate(name_tl=dish["name_tl"], name_en=dish["name_en"],
        description_tl="Tested recipe description stored in SQLite.", cook_minutes=dish["cook_minutes"] + 1,
        steps_short=["Prepare the ingredients.", "Cook until done."]), owner)
    assert main.recipe(dish["slug"])["description_tl"] == edited["description_tl"]
    rejected(lambda: main.admin_user(first), 403)
    main.remove_member(first["id"], owner)
    assert len(main.household_members(owner)["members"]) == 2
    rejected(lambda: main.session_user(first_token), 401)
    fixes = main.load_data_fixes()
    assert len(fixes) == len(main.json.loads((main.DATA / "data-fixes.json").read_text(encoding="utf-8")))
    title_fix, category_fix = (next(fix for fix in fixes if fix["table"] == "catalog_items" and fix["field"] == field) for field in ("title", "category"))
    with main.connection() as db:
        for fix in (title_fix, category_fix):
            payload = main.json.loads(db.execute("SELECT payload FROM catalog_items WHERE id = ?", (fix["id"],)).fetchone()["payload"])
            # The title row goes back to its old value; the category row gets an admin edit the fix must leave alone.
            value = fix["old"] if fix is title_fix else "Admin choice"
            payload[fix["field"]] = value
            db.execute(f"UPDATE catalog_items SET {fix['field']} = ?, payload = ? WHERE id = ?", (value, main.json.dumps(payload), fix["id"]))
        main.apply_data_fixes(db)
        main.apply_data_fixes(db)
        title_row = db.execute("SELECT title, payload FROM catalog_items WHERE id = ?", (title_fix["id"],)).fetchone()
        category_row = db.execute("SELECT category FROM catalog_items WHERE id = ?", (category_fix["id"],)).fetchone()
    assert title_row["title"] == title_fix["new"] == main.json.loads(title_row["payload"])["title"]
    assert category_row["category"] == "Admin choice"
    catalog = main.seo_catalog(Response())
    assert catalog["total"] == len(catalog["items"]) == main.health()["catalog_images"]
    assert any(item["recipe"] for item in catalog["items"]) and any(item["recipe"] is None for item in catalog["items"])
    print("PASS: owner, two-member limit, invitation, shared state, isolated saves, featured week, ingredient and recipe edits, removal, data fixes, seo catalog")


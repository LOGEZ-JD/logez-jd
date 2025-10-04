from flask import Flask


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY="change-me",
        DATABASE="sqlite:///instance/app.db",
        JSON_SORT_KEYS=False,
    )

    # Blueprints
    from .routes import bp as routes_bp
    app.register_blueprint(routes_bp)

    # Ensure instance folder exists
    try:
        import os
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    return app

package httpserver // тот же пакет, что и router/response

import (
	"net/http" // нам нужен доступ к ServeMux/Handler
)

// openapiJSON — статическая OpenAPI 3.0 спецификация в JSON.
// Здесь описан наш эндпоинт POST /api/repo/resolve и формат ошибок.
const openapiJSON = `{
  "openapi": "3.0.3",
  "info": {
    "title": "CleanHTTP API",
    "version": "0.1.0",
    "description": "Пример API с разбором GitHub URL и резолвом default_branch"
  },
  "paths": {
  "/api/repo/tree": {
  "get": {
    "summary": "Получить дерево репозитория",
    "parameters": [
      { "name": "owner", "in": "query", "required": true,  "schema": {"type":"string"} },
      { "name": "repo",  "in": "query", "required": true,  "schema": {"type":"string"} },
      { "name": "ref",   "in": "query", "required": false, "schema": {"type":"string"}, "description":"ветка/тег/коммит; по умолчанию main" }
    ],
    "responses": {
      "200": {
        "description": "Ок",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "items": {
                  "type":"array",
                  "items": {
                    "type":"object",
                    "required":["path","type","size","lfs","submodule"],
                    "properties":{
                      "path":{"type":"string","example":"cmd/api/main.go"},
                      "type":{"type":"string","enum":["file","dir"]},
                      "size":{"type":"integer","format":"int64"},
                      "lfs":{"type":"boolean"},
                      "submodule":{"type":"boolean"}
                    }
                  }
                }
              }
            }
          }
        }
      },
      "400": { "$ref": "#/components/responses/BadRequest" },
      "404": { "$ref": "#/components/responses/NotFound" },
      "429": { "$ref": "#/components/responses/RateLimited" },
      "502": { "$ref": "#/components/responses/UpstreamError" },
      "500": { "$ref": "#/components/responses/InternalError" }
    }
  }
}
    "/api/repo/resolve": {
      "post": {
        "summary": "Разобрать GitHub URL и получить default_branch",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["url"],
                "properties": {
                  "url": { "type": "string", "example": "https://github.com/vercel/next.js" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Успешный ответ",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["owner","repo","defaultRef","refs"],
                  "properties": {
                    "owner": { "type": "string", "example": "vercel" },
                    "repo": { "type": "string", "example": "next.js" },
                    "defaultRef": { "type": "string", "example": "main" },
                    "refs": { "type": "array", "items": { "type": "string" } }
                  }
                }
              }
            }
          },
          "400": { "$ref": "#/components/responses/BadRequest" },
          "404": { "$ref": "#/components/responses/NotFound" },
          "429": { "$ref": "#/components/responses/RateLimited" },
          "502": { "$ref": "#/components/responses/UpstreamError" },
          "500": { "$ref": "#/components/responses/InternalError" }
        }
      }
    }
  },
  "components": {
    "responses": {
      "BadRequest": {
        "description": "Невалидный запрос",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "NotFound": {
        "description": "Репозиторий не найден",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "RateLimited": {
        "description": "Достигнут лимит GitHub API",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "UpstreamError": {
        "description": "Ошибка на стороне GitHub",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "InternalError": {
        "description": "Внутренняя ошибка сервера",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "required": ["error"],
        "properties": {
          "error": {
            "type": "object",
            "required": ["code","message"],
            "properties": {
              "code": { "type": "string", "example": "bad_request" },
              "message": { "type": "string", "example": "invalid JSON body" },
              "details": { "type": "object", "additionalProperties": true }
            }
          }
        }
      }
    }
  }
}`

// swaggerHTML — простая страница Swagger UI, которая берёт спецификацию с /openapi.json.
// Здесь мы используем CDN swagger-ui-dist — интернет должен быть доступен.
const swaggerHTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>CleanHTTP API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
  <style> body { margin: 0; } #swagger-ui { height: 100vh; } </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '/openapi.json', // путь к нашей спецификации
      dom_id: '#swagger-ui'
    });
  };
  </script>
</body>
</html>`

// MountSwagger регистрирует два хендлера на mux: /openapi.json и /docs.
func MountSwagger(mux *http.ServeMux) {
	// /openapi.json — отдаём OpenAPI JSON со строковой константы
	mux.HandleFunc("/openapi.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8") // правильный content-type
		w.WriteHeader(http.StatusOK)                                      // 200 OK
		_, _ = w.Write([]byte(openapiJSON))                               // пишем тело ответа
	})

	// /docs — отдаём HTML-страницу Swagger UI
	mux.HandleFunc("/docs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8") // HTML-контент
		w.WriteHeader(http.StatusOK)                                // 200 OK
		_, _ = w.Write([]byte(swaggerHTML))                        // пишем HTML
	})
}

Estoy trabajando sobre una aplicación existente.

Endpoints disponibles:
- POST /api/users/ -> Create User
- POST /api/auth/verify-email -> Verify Email
- POST /api/auth/resend-verification -> Resend Verification
- POST /api/auth/login -> Login

Schemas disponibles:
- UserCreateDTO
- UserDTO
- VerifyEmailRequest
- MessageResponse

Historia de usuario:
Como usuario quiero poder registrarme con mis datos personales
para estar identificado dentro de la aplicación al comprar o vender ropa.

Criterios de aceptación:
1. El usuario se registra con sus datos y se crea su perfil.
2. Luego es redirigido al inicio de la página.
3. Si intenta registrarse con datos ya existentes, se informa el error.
4. Se envía email de verificación al registrarse.

IMPORTANTE:
No crear endpoints nuevos ni modificar arquitectura existente.
Usar exclusivamente endpoints y schemas existentes.
Analizar primero el proyecto antes de generar código.

- [ ] Crear Register page
- [ ] Conectar POST /api/users/
- [ ] Manejar errores duplicados
- [ ] Flujo verify email
- [ ] Redirect home
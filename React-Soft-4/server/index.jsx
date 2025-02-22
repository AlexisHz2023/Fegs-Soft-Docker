const express = require("express");
const app = express();
const mysql = require('mysql2');
const cors = require("cors");
const bcrypt = require('bcryptjs');
const saltRounds = 10;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'db',  // Nombre del servicio en Docker Compose
    user: 'root',
    password: 'fegs2024',
    database: 'fegs-soft-react',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
    connection.release();
  });


app.post("/create", async (req, res) => {
    const { Nombre, Correo, Documento, Clave, rol } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(Clave, saltRounds);

        db.query(
            'SELECT * FROM usuarios WHERE Correo = ? OR Documento = ?',
            [Correo, Documento],
            (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error en el servidor");
                } else if (result.length > 0) {
                    res.status(400).send("Correo o Documento ya existen");
                } else {
                    db.query(
                        'INSERT INTO usuarios (Nombre, Correo, Documento, Clave, rol) VALUES (?, ?, ?, ?, ?)',
                        [Nombre, Correo, Documento, hashedPassword, rol],
                        (err, result) => {
                            if (err) {
                                console.log(err);
                                res.status(500).send("Error al crear usuario");
                            } else {
                                res.send(result);
                            }
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).send("Error en el servidor");
    }
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    pool.query(
        'SELECT * FROM usuarios WHERE Correo = ?',
        [email],
        async (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error en el servidor");
            } else {
                if (result.length > 0) {
                    // Compara la contraseña ingresada con la encriptada
                    const match = await bcrypt.compare(password, result[0].Clave);
                    if (match) {
                        const user = {
                            id: result[0].id,
                            Nombre: result[0].Nombre,
                            Correo: result[0].Correo,
                            Documento: result[0].Documento,
                            rol: result[0].rol
                        };
                        return res.status(200).json({ message: 'Inicio de sesión exitoso', user });
                    } else {
                        return res.status(401).send("Credenciales inválidas");
                    }
                } else {
                    return res.status(401).send("Credenciales inválidas");
                }
            }
        }
    );
});



app.put("/update", (req, res) => {
    const { id, Nombre, Correo } = req.body;

    try {
        // Si el Correo está presente, verificamos si ya existe para otro usuario
        if (Correo) {
            db.query(
                'SELECT * FROM usuarios WHERE Correo = ? AND id != ?',
                [Correo, id],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Error en el servidor");
                    } else if (result.length > 0) {
                        res.status(400).send("Correo ya existe");
                    } else {
                        // Si no existe, procedemos a la actualización
                        actualizarUsuario();
                    }
                }
            );
        } else {
            // Si solo se va a actualizar el Nombre, procedemos directamente
            actualizarUsuario();
        }

        // Función para actualizar el usuario
        const actualizarUsuario = () => {
            db.query(
                'UPDATE usuarios SET Nombre = ?, Correo = COALESCE(?, Correo) WHERE id = ?',
                [Nombre, Correo, id],
                (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Error al actualizar el usuario");
                    } else {
                        res.send(result);
                    }
                }
            );
        };
    } catch (error) {
        console.log(error);
        res.status(500).send('Error en el servidor');
    }
});

app.put("/updateaso", (req, res) => {
    const { id, Nombre, Correo, Documento } = req.body;

    try {
        db.query(
            'SELECT * FROM usuarios WHERE (Correo = ? OR Documento = ?) AND id != ?',
            [Correo, Documento, id],
            (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error en el servidor");
                } else if (result.length > 0) {
                    res.status(400).send("Correo o Documento ya existen");
                } else {
                    db.query(
                        'UPDATE usuarios SET Nombre=?, Correo=?, Documento=? WHERE id=?',
                        [Nombre, Correo, Documento, id],
                        (err, result) => {
                            if (err) {
                                console.log(err);
                                res.status(500).send("Error al actualizar el usuario");
                            } else {
                                res.send(result);
                            }
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).send('Error en el servidor');
    }
});

app.get("/usuarios", (req, res) => {
    db.query(
        `SELECT u.id, u.Nombre, u.Correo, u.Documento, r.rol AS rol_nombre
         FROM usuarios u
         JOIN rol r ON u.rol = r.idrol
         WHERE u.rol IN (1, 2)`,
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error al obtener usuarios');
            } else {
                res.send(result);
            }
        }
    );
});

app.get("/tblcreditos", (req, res) => {
    db.query(`
        SELECT 
            c.idcreditos, 
            c.rotativo, 
            c.SEC, 
            c.novedades_varias, 
            c.compra_cartera, 
            u.Nombre AS nombreCredi, 
            u.Documento AS documentoCredi,
            c.fecha
        FROM creditos c
        INNER JOIN usuarios u ON c.usuariocredi = u.id
    `, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error al obtener los datos de créditos');
        } else {
            res.send(result);
        }
    });
});

app.get("/tblobligatorios", (req, res) => {
    db.query(`
        SELECT 
            ao.idobligatorio, 
            ao.ahorro_ordinario, 
            ao.ahorro_permanente, 
            u.Nombre AS nombreUsuario, 
            u.Documento AS documentoUsuario, 
            ao.fecha
        FROM ahorros_obligatorios ao
        INNER JOIN usuarios u ON ao.usuariobli = u.id
    `, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error al obtener los datos del ahorro obligatorio');
        } else {
            res.send(result);
        }
    });
});

app.get("/tblvoluntarios", (req, res) => {
    db.query(`
        SELECT av.idahorros, av.vista, av.programado, av.vacacional, av.previo_vivienda, u.Nombre, u.Documento, av.fecha
        FROM ahorros_voluntarios av
        INNER JOIN usuarios u ON av.usuariovolu = u.id
    `, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error al obtener los datos del ahorro voluntario');
        } else {
            res.send(result);
        }
    });
});

app.delete("/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query(
        'DELETE FROM usuarios WHERE id=?', id,
        (err, result) => {
            if (err) {
                console.log(err);
            } else {
                res.send(result);
            }
        }
    );
});



app.get("/creditos/:id", (req, res) => {
    const id = req.params.id;
    db.query('SELECT idcreditos, rotativo, SEC, novedades_varias, compra_cartera, usuariocredi, fecha FROM creditos WHERE usuariocredi = ?;',
        [id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error al obtener los datos de creditos');
            } else {
                res.send(result);
            }
        });
});

app.get("/obligatorios/:id", (req, res) => {
    const id = req.params.id; // Obtener el id de los parámetros de ruta
    db.query('SELECT idobligatorio, ahorro_ordinario, ahorro_permanente, usuariobli, fecha FROM ahorros_obligatorios WHERE usuariobli = ?;',
        [id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error al obtener los datos del ahorro obligatorio');
            } else {
                res.send(result);
            }
        });
});

app.get("/voluntarios/:id", (req, res) => {
    const id = req.params.id;
    db.query('SELECT idahorros, vista, programado, vacacional, previo_vivienda, usuariovolu, fecha FROM ahorros_voluntarios WHERE usuariovolu = ?;',
        [id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error al obtener los datos del ahorro voluntario');
            } else {
                res.send(result);
            }
        });
});

app.put("/updateVolu", (req, res) => {
    const { idahorros, vista, programado, vacacional, previo_vivienda } = req.body;

    try {
        if (!idahorros || vista === undefined || programado === undefined || vacacional === undefined || previo_vivienda === undefined) {
            return res.status(400).send("Todos los campos son necesarios");
        }

        // Primero, obtenemos los valores actuales de la base de datos
        db.query(
            'SELECT vista, programado, vacacional, previo_vivienda FROM ahorros_voluntarios WHERE idahorros = ?',
            [idahorros],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error en el servidor al obtener los valores actuales");
                }

                if (result.length === 0) {
                    return res.status(404).send("No se encontró el registro de ahorros_voluntarios");
                }

                // Convertimos los valores actuales y los nuevos a números y los sumamos
                const currentValues = result[0];
                const newVista = Number(currentValues.vista) + Number(vista);
                const newProgramado = Number(currentValues.programado) + Number(programado);
                const newVacacional = Number(currentValues.vacacional) + Number(vacacional);
                const newPrevioVivienda = Number(currentValues.previo_vivienda) + Number(previo_vivienda);

                // Actualizamos la base de datos con los valores sumados
                db.query(
                    'UPDATE ahorros_voluntarios SET vista = ?, programado = ?, vacacional = ?, previo_vivienda = ? WHERE idahorros = ?',
                    [newVista, newProgramado, newVacacional, newPrevioVivienda, idahorros],
                    (err, result) => {
                        if (err) {
                            console.error("Error en la actualización:", err);
                            return res.status(500).send("Error al actualizar el ahorros_voluntarios");
                        }
                        res.send(result);
                    }
                );
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).send('Error en el servidor');
    }
});

app.put("/updateOblig", (req, res) => {
    const { idobligatorio, ahorro_ordinario, ahorro_permanente } = req.body;

    try {
        if (!idobligatorio || ahorro_ordinario === undefined || ahorro_permanente === undefined) {
            return res.status(400).send("Todos los campos son necesarios");
        }

        // Primero, obtenemos los valores actuales de la base de datos
        db.query(
            'SELECT ahorro_ordinario, ahorro_permanente FROM ahorros_obligatorios WHERE idobligatorio = ?',
            [idobligatorio],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error en el servidor al obtener los valores actuales");
                }

                if (result.length === 0) {
                    return res.status(404).send("No se encontró el registro de ahorros_obligatorios");
                }

                // Convertimos los valores actuales y los nuevos a números y los sumamos
                const currentValues = result[0];
                const newAhorroOrdinario = Number(currentValues.ahorro_ordinario) + Number(ahorro_ordinario);
                const newAhorroPermanente = Number(currentValues.ahorro_permanente) + Number(ahorro_permanente);

                // Actualizamos la base de datos con los valores sumados
                db.query(
                    'UPDATE ahorros_obligatorios SET ahorro_ordinario = ?, ahorro_permanente = ? WHERE idobligatorio = ?',
                    [newAhorroOrdinario, newAhorroPermanente, idobligatorio],
                    (err, result) => {
                        if (err) {
                            console.error("Error en la actualización:", err);
                            return res.status(500).send("Error al actualizar el ahorros_obligatorios");
                        }
                        res.send(result);
                    }
                );
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).send('Error en el servidor');
    }
});


app.put("/updateCredi", (req, res) => {
    const { idcreditos, rotativo, SEC, novedades_varias, compra_cartera } = req.body;

    try {
        if (!idcreditos || rotativo === undefined || SEC === undefined || novedades_varias === undefined || compra_cartera === undefined) {
            return res.status(400).send("Todos los campos son necesarios");
        }

        // Primero, obtenemos los valores actuales de la base de datos
        db.query(
            'SELECT rotativo, SEC, novedades_varias, compra_cartera FROM creditos WHERE idcreditos = ?',
            [idcreditos],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error en el servidor al obtener los valores actuales");
                }

                if (result.length === 0) {
                    return res.status(404).send("No se encontró el registro de creditos");
                }

                // Convertimos los valores actuales y los nuevos a números y los sumamos
                const currentValues = result[0];
                const newRotativo = Number(currentValues.rotativo) + Number(rotativo);
                const newSEC = Number(currentValues.SEC) + Number(SEC);
                const newNovedadesVarias = Number(currentValues.novedades_varias) + Number(novedades_varias);
                const newCompraCartera = Number(currentValues.compra_cartera) + Number(compra_cartera);

                // Actualizamos la base de datos con los valores sumados
                db.query(
                    'UPDATE creditos SET rotativo = ?, SEC = ?, novedades_varias = ?, compra_cartera = ? WHERE idcreditos = ?',
                    [newRotativo, newSEC, newNovedadesVarias, newCompraCartera, idcreditos],
                    (err, result) => {
                        if (err) {
                            console.error("Error en la actualización:", err);
                            return res.status(500).send("Error al actualizar el creditos");
                        }
                        res.send(result);
                    }
                );
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).send('Error en el servidor');
    }
});

app.get("/asociados", (req, res) => {
    db.query('SELECT id, Nombre, Correo, Documento FROM usuarios WHERE rol = 3',
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error al obtener asociados');
            } else {
                res.send(result);
            }
        });
});

app.post("/NuevoBeneficio", (req, res) => {
    const { Documento, tipoBeneficio } = req.body;
    console.log(tipoBeneficio);
    let benefitId;
    let ahorroTabla, usuarioCampo, ahorroCampos, ahorroValores;

    // Definir variables según el tipo de beneficio
    if (tipoBeneficio === 3) { // Obligatorio
        benefitId = 3;
        ahorroTabla = "ahorros_obligatorios";
        usuarioCampo = "usuariobli";
        ahorroCampos = "ahorro_ordinario, ahorro_permanente, usuariobli, beneficios, fecha";
        ahorroValores = [0, 0]; // valores para ahorro_ordinario, ahorro_permanente
    } else if (tipoBeneficio === 2) { // Voluntario
        benefitId = 2;
        ahorroTabla = "ahorros_voluntarios";
        usuarioCampo = "usuariovolu";
        ahorroCampos = "vista, programado, vacacional, previo_vivienda, usuariovolu, beneficios, fecha";
        ahorroValores = [0, 0, 0, 0]; // valores para vista, programado, vacacional, previo_vivienda
    } else if (tipoBeneficio === 1) { // Crédito
        benefitId = 1;
        ahorroTabla = "creditos";
        usuarioCampo = "usuariocredi";
        ahorroCampos = "rotativo, SEC, novedades_varias, compra_cartera, usuariocredi, beneficios, fecha";
        ahorroValores = [0, 0, 0, 0]; // valores para rotativo, SEC, novedades_varias, compra_cartera
    } else {
        res.status(400).send("Tipo de beneficio no válido");
        return;
    }

    try {
        // Verificar si el usuario existe
        db.query('SELECT id FROM usuarios WHERE Documento = ?', [Documento], (err, userResult) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error al buscar el usuario");
            } else if (userResult.length === 0) {
                res.status(404).send("Usuario no encontrado");
            } else {
                const userId = userResult[0].id;

                // Verificar si ya existe en la tabla correspondiente
                db.query(`SELECT * FROM ${ahorroTabla} WHERE ${usuarioCampo} = ?`, [userId], (err, ahorroResult) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send("Error al buscar en la tabla de ahorros");
                    } else if (ahorroResult.length > 0) {
                        res.status(400).send(`El usuario ya tiene un beneficio de tipo ${tipoBeneficio} asociado`);
                    } else {
                        // Verificar si ya existe en aso_bene
                        db.query('SELECT * FROM aso_bene WHERE usuario = ? AND beneficios = ?', [userId, benefitId], (err, asoBeneResult) => {
                            if (err) {
                                console.log(err);
                                res.status(500).send("Error al verificar beneficio asociado");
                            } else if (asoBeneResult.length > 0) {
                                res.status(400).send("El usuario ya tiene este beneficio asociado");
                            } else {
                                // Insertar en aso_bene
                                db.query(
                                    'INSERT INTO aso_bene (usuario, beneficios) VALUES (?, ?)',
                                    [userId, benefitId],
                                    (err, result) => {
                                        if (err) {
                                            console.log(err);
                                            res.status(500).send("Error al asociar beneficio al usuario");
                                        } else {
                                            // Insertar en la tabla correspondiente
                                            db.query(
                                                `INSERT INTO ${ahorroTabla} (${ahorroCampos}) VALUES (${ahorroValores.map(() => '?').join(', ')}, ?, ?, ?)`,
                                                [...ahorroValores, userId, benefitId, new Date()],
                                                (err, ahorroResult) => {
                                                    if (err) {
                                                        console.log(err);
                                                        res.status(500).send("Error al crear ahorro asociado");
                                                    } else {
                                                        res.send(`Beneficio tipo ${tipoBeneficio} asociado correctamente y datos insertados en ${ahorroTabla}`);
                                                    }
                                                }
                                            );
                                        }
                                    }
                                );
                            }
                        });
                    }
                });
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error en el servidor");
    }
});
  

  app.get("/usuario-datos", (req, res) => {
    const documento = req.query.documento;
    const beneficio = parseInt(req.query.beneficio);
  
    if (!documento || isNaN(beneficio)) {
      return res.status(400).send('Parámetros de entrada inválidos');
    }
  
    // Consulta para obtener el ID del usuario basado en el documento
    const getUserIdQuery = `
        SELECT id 
        FROM usuarios 
        WHERE documento = ?;
    `;
  
    db.query(getUserIdQuery, [documento], (err, result) => {
        if (err) {
            console.error('Error al obtener el ID del usuario:', err);
            return res.status(500).send('Error interno del servidor');
        }
  
        if (result.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }
  
        const userId = result[0].id;
        console.log(`ID del usuario encontrado: ${userId}`); // Depuración
  
        let query;
        let queryParams = [userId];
  
        switch (beneficio) {
          case 1:
            query = `
                SELECT 
                    'Credito' AS tipo,
                    seg.idsegC AS id,
                    seg.monto,
                    seg.beneficios,
                    seg.tipo_monto,
                    seg.fecha,
                    usr.documento
                FROM 
                    seg_creditos seg
                JOIN 
                    usuarios usr ON seg.usuario = usr.id
                WHERE 
                    seg.usuario = ?;
            `;
            break;
  
          case 2:
            query = `
                SELECT 
                    'Ahorro Voluntario' AS tipo,
                    seg.idsegV AS id,
                    seg.monto,
                    seg.beneficios,
                    seg.tipo_monto,
                    seg.fecha,
                    usr.documento
                FROM 
                    seg_ahorros_voluntarios seg
                JOIN 
                    usuarios usr ON seg.usuario = usr.id
                WHERE 
                    seg.usuario = ?;
            `;
            break;
  
          case 3:
            query = `
                SELECT 
                    'Ahorro Obligatorio' AS tipo,
                    seg.idsegO AS id,
                    seg.monto,
                    seg.beneficios,
                    seg.tipo_monto,
                    seg.fecha,
                    usr.documento
                FROM 
                    seg_ahorros_obligatorios seg
                JOIN 
                    usuarios usr ON seg.usuario = usr.id
                WHERE 
                    seg.usuario = ?;
            `;
            break;
  
          case 0:
            query = `
                SELECT 
                    'Credito' AS tipo,
                    seg.idsegC AS id,
                    seg.monto,
                    seg.beneficios,
                    seg.tipo_monto,
                    seg.fecha,
                    usr.documento
                FROM 
                    seg_creditos seg
                JOIN 
                    usuarios usr ON seg.usuario = ?
                
                UNION ALL
                
                SELECT 
                    'Ahorro Voluntario' AS tipo,
                    seg.idsegV AS id,
                    seg.monto,
                    seg.beneficios,
                    seg.tipo_monto,
                    seg.fecha,
                    usr.documento
                FROM 
                    seg_ahorros_voluntarios seg
                JOIN 
                    usuarios usr ON seg.usuario = ?
                
                UNION ALL
                
                SELECT 
                    'Ahorro Obligatorio' AS tipo,
                    seg.idsegO AS id,
                    seg.monto,
                    seg.beneficios,
                    seg.tipo_monto,
                    seg.fecha,
                    usr.documento
                FROM 
                    seg_ahorros_obligatorios seg
                JOIN 
                    usuarios usr ON seg.usuario = ?
                
                ORDER BY 
                    fecha;
            `;
            queryParams = [userId, userId, userId];
            break;
  
          default:
            return res.status(400).send('Beneficio no válido');
        }
  
        // Ejecutar la consulta según el beneficio seleccionado
        db.query(query, queryParams, (err, result) => {
            if (err) {
                console.error('Error al obtener los datos del usuario:', err);
                return res.status(500).send('Error interno del servidor');
            }
            console.log(`Resultados de la consulta:`, result); // Depuración
            res.send(result);
        });
    });
  });

app.listen(3000, () => {
    console.log("Corriendo en el puerto 3000");
});
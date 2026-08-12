-- Se retira la función de plantillas. Nunca llegó a ser útil: al crearlas solo
-- se podía poner nombre y descripción, y el esqueleto salía siempre vacío, así
-- que una plantilla no guardaba ninguna estructura.
--
-- Se elimina la tabla en lugar de dejarla huérfana. Si alguna vez vuelve, será
-- con un diseño distinto y su propia migración.
DROP TABLE IF EXISTS templates;

const sqlite3 = require('sqlite3').verbose();

class DB{
    static #db;

    static open(){
        if (this.#db == undefined){
            this.#db = new sqlite3.Database('C:\Users\jorgeb03\Documents\db.sqlite3', sqlite3.OPEN_READWRITE | sqlite3.OPEN_FULLMUTEX,(err)=>{
                if(err){
                    console.error(err.message);
                }else{
                    console.log("Conexion exitosaaaaa");
                }
            });
        }
        return this.#db;
    }

    static close(){
        if (this.#db != undefined){
            this.#db.close();
        }
    }
}

module.exports = DB;
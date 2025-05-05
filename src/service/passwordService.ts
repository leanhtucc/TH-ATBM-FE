/* eslint-disable prettier/prettier */
import { createApi } from "utils/apiUtils";


const passwordService = {
     http: createApi(),

     getAllPasswords(){
        return this.http.get('/passwords');
     },
     getPasswordById(id: string){
        return this.http.get(`/passwords/${id}`);
     },
     addPassword(data: any){
        return this.http.post('/passwords', data);
     },
     updatePassword(id: string, data: any){
        return this.http.put(`/passwords/${id}`, data);
     },
     deletePassword(id: string){
        return this.http.delete(`/passwords/${id}`);
     },
}

export default passwordService;
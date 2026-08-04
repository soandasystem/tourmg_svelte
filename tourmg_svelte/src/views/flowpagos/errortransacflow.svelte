<script>
    export let mensage1 = '';
    export let mensage2 = '';
</script>

<style>
.bs-calltoaction{
    position: relative;
    width:auto;
    padding: 15px 25px;
    border: 1px solid black;
    margin-top: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
}

.bs-calltoaction > .row{
    display:table;
    width: calc(100% + 30px);
}
    
.bs-calltoaction > .row > [class^="col-"],
.bs-calltoaction > .row > [class*=" col-"]{
    float:none;
    display:table-cell;
    vertical-align:middle;
}

.cta-contents{
    padding-top: 10px;
    padding-bottom: 10px;
}

.cta-title{
    margin: 0 auto 15px;
    padding: 0;
}

.cta-desc{
    padding: 0;
}

.cta-desc p:last-child{
    margin-bottom: 0;
}

.cta-button{
    padding-top: 10px;
    padding-bottom: 10px;
}

@media (max-width: 991px){
    .bs-calltoaction > .row{
        display:block;
        width: auto;
    }

    .bs-calltoaction > .row > [class^="col-"],
    .bs-calltoaction > .row > [class*=" col-"]{
        float:none;
        display:block;
        vertical-align:middle;
        position: relative;
    }

    .cta-contents{
        text-align: center;
    }
}
.bs-calltoaction.bs-calltoaction-danger{
    color: #fff;
    background-color: #d9534f;
    border-color: #d43f3a;
}

.bs-calltoaction.bs-calltoaction-danger .cta-button .btn{
    border-color:#fff;
}
   
</style>

<div class="container">
    <div class="col-sm-12 mt-3">

        <div class="bs-calltoaction bs-calltoaction-danger" id="errortrbk">
            <div class="row">
                <div class="col-md-9 cta-contents">
                    <h1 class="cta-title">Error en Transacción</h1>
                    <div class="cta-desc">
                        <p>{mensage1}</p>
                        {#if mensage2}
                            <p>{mensage2}</p>
                        {/if}
                    </div>
                </div>
                <div class="col-md-3 cta-button">
                    <a href="/payment" class="btn btn-lg btn-block btn-danger btnvolver">Volver a Pagos</a>
                </div>
             </div>
        </div>

    </div>
</div>
